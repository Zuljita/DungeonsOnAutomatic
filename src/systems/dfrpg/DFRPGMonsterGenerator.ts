import { MONSTERS, type DFRPGMonster, getThematicTags } from './data/monsters';
import { calculateTargetCER, type ThreatLevelName, THREAT_LEVELS } from './data/threats';
import type { Monster, RNG } from '../../core/types';

export type { DFRPGMonster };

export interface GenerateOptions {
  characterPoints: number;
  threatLevel?: ThreatLevelName;
  biome?: string;
  requiredTags?: string[];
  maxSize?: number; // Maximum Size Modifier
  preferGroupedEncounters?: boolean;
}

export interface GeneratedEncounter {
  monsters: Monster[];
  totalCER: number;
  actualThreatLevel: string;
  encounterType: 'single' | 'group' | 'mixed';
}

/**
 * DFRPG Monster Generator implementing relative CER system
 * Follows the design document specifications for threat scaling and thematic grouping
 */
export class DFRPGMonsterGenerator {
  private rng: RNG;
  private monsterPool: DFRPGMonster[];

  constructor(rng: RNG = Math.random, customMonsterPool?: DFRPGMonster[]) {
    this.rng = rng;
    this.monsterPool = customMonsterPool || MONSTERS;
  }

  /**
   * Generate an encounter based on relative challenge system
   */
  generate(options: GenerateOptions): GeneratedEncounter {
    const {
      characterPoints,
      threatLevel = 'Average',
      biome = 'dungeon',
      requiredTags = [],
      maxSize = 2, // Default to SM+2 or smaller
      preferGroupedEncounters = true
    } = options;

    // Step 1: Calculate Target Encounter CER
    const targetCER = calculateTargetCER(characterPoints, threatLevel, this.rng);

    // Step 2: Filter Monster List
    const availableMonsters = this.filterMonsters(biome, maxSize, requiredTags);

    if (availableMonsters.length === 0) {
      // Fallback to basic monsters if no matches
      return this.generateFallbackEncounter(targetCER);
    }

    // Step 3: Select Monsters & Calculate Quantity
    const encounter = preferGroupedEncounters
      ? this.generateThematicEncounter(availableMonsters, targetCER)
      : this.generateMixedEncounter(availableMonsters, targetCER);

    return {
      ...encounter,
      actualThreatLevel: this.calculateActualThreatLevel(encounter.totalCER, characterPoints)
    };
  }

  /**
   * Filter monsters by biome, size, tags, and CER constraints
   */
  private filterMonsters(biome: string, maxSize: number, requiredTags: string[]): DFRPGMonster[] {
    return this.monsterPool.filter(monster => {
      // Size filter - null SM treated as 0
      const monsterSize = monster.sm ?? 0;
      if (monsterSize > maxSize) return false;

      // Biome filter
      if (!monster.biome.includes(biome) && !monster.biome.includes('any')) return false;

      // Required tags filter
      if (requiredTags.length > 0) {
        const hasAllRequiredTags = requiredTags.every(tag =>
          monster.tags.some(monsterTag => 
            monsterTag.toLowerCase().includes(tag.toLowerCase()) ||
            tag.toLowerCase().includes(monsterTag.toLowerCase())
          )
        );
        if (!hasAllRequiredTags) return false;
      }

      // CER filter - exclude monsters with 0 CER (typically non-combat)
      if (monster.cer <= 0) return false;

      return true;
    });
  }

  /**
   * Generate thematic encounter with leader-minion relationships
   */
  private generateThematicEncounter(availableMonsters: DFRPGMonster[], targetCER: number): Omit<GeneratedEncounter, 'actualThreatLevel'> {
    // Try to find a thematic group first
    const thematicGroups = this.findThematicGroups(availableMonsters);
    
    if (thematicGroups.length > 0 && this.rng() < 0.7) {
      // 70% chance to use thematic grouping
      const selectedGroup = thematicGroups[Math.floor(this.rng() * thematicGroups.length)];
      return this.buildThematicEncounter(selectedGroup, targetCER);
    }

    // Fallback to mixed encounter
    return this.generateMixedEncounter(availableMonsters, targetCER);
  }

  /**
   * Find thematic groups of monsters that share common tags
   */
  private findThematicGroups(monsters: DFRPGMonster[]): DFRPGMonster[][] {
    const groups: DFRPGMonster[][] = [];
    const usedMonsters = new Set<string>();

    for (const monster of monsters) {
      if (usedMonsters.has(monster.name)) continue;

      const thematicTags = getThematicTags(monster);
      if (thematicTags.length === 0) continue;

      const group = monsters.filter(m => {
        if (usedMonsters.has(m.name)) return false;
        const mTags = getThematicTags(m);
        return mTags.some(tag => thematicTags.includes(tag));
      });

      if (group.length >= 2) {
        groups.push(group);
        group.forEach(m => usedMonsters.add(m.name));
      }
    }

    return groups;
  }

  /**
   * Build encounter from thematic group with leader-minion logic
   */
  private buildThematicEncounter(group: DFRPGMonster[], targetCER: number): Omit<GeneratedEncounter, 'actualThreatLevel'> {
    const monsters: Monster[] = [];
    let totalCER = 0;

    // Sort by CER to identify potential leaders
    const sortedGroup = [...group].sort((a, b) => b.cer - a.cer);
    
    // Try leader + minions approach
    const potentialLeaders = sortedGroup.filter(m => m.cer >= targetCER * 0.3);
    const potentialMinions = sortedGroup.filter(m => m.cer < targetCER * 0.3);

    if (potentialLeaders.length > 0 && potentialMinions.length > 0 && this.rng() < 0.6) {
      // 60% chance for leader + minions
      const leader = potentialLeaders[Math.floor(this.rng() * potentialLeaders.length)];
      monsters.push(this.convertToMonster(leader));
      totalCER += leader.cer;

      // Add minions to fill remaining CER
      const remainingCER = targetCER - totalCER;
      const minionsAdded = this.addMinions(potentialMinions, remainingCER, monsters);
      totalCER += minionsAdded;

      return {
        monsters,
        totalCER,
        encounterType: 'group'
      };
    }

    // Fallback to balanced group
    return this.buildBalancedGroup(sortedGroup, targetCER);
  }

  /**
   * Add minions to fill remaining CER budget
   */
  private addMinions(minions: DFRPGMonster[], remainingCER: number, monsters: Monster[]): number {
    let addedCER = 0;
    const maxMinions = 8; // Reasonable limit for playability
    
    while (addedCER < remainingCER && monsters.length < maxMinions) {
      const affordableMinions = minions.filter(m => m.cer <= (remainingCER - addedCER));
      if (affordableMinions.length === 0) break;

      const minion = affordableMinions[Math.floor(this.rng() * affordableMinions.length)];
      monsters.push(this.convertToMonster(minion));
      addedCER += minion.cer;
    }

    return addedCER;
  }

  /**
   * Build balanced group without leader-minion structure
   */
  private buildBalancedGroup(monsters: DFRPGMonster[], targetCER: number): Omit<GeneratedEncounter, 'actualThreatLevel'> {
    const result: Monster[] = [];
    let totalCER = 0;
    const maxMonsters = 6;

    // Try to distribute CER evenly among multiple monsters
    const avgCERPerMonster = targetCER / 3; // Aim for ~3 monsters
    const suitableMonsters = monsters.filter(m => 
      m.cer >= avgCERPerMonster * 0.5 && m.cer <= avgCERPerMonster * 2
    );

    const monstersToUse = suitableMonsters.length > 0 ? suitableMonsters : monsters;

    while (totalCER < targetCER && result.length < maxMonsters) {
      const remainingCER = targetCER - totalCER;
      const affordableMonsters = monstersToUse.filter(m => m.cer <= remainingCER);
      
      if (affordableMonsters.length === 0) break;

      const selected = affordableMonsters[Math.floor(this.rng() * affordableMonsters.length)];
      result.push(this.convertToMonster(selected));
      totalCER += selected.cer;
    }

    return {
      monsters: result,
      totalCER,
      encounterType: result.length === 1 ? 'single' : 'group'
    };
  }

  /**
   * Generate mixed encounter without thematic constraints
   */
  private generateMixedEncounter(monsters: DFRPGMonster[], targetCER: number): Omit<GeneratedEncounter, 'actualThreatLevel'> {
    const result: Monster[] = [];
    let totalCER = 0;
    const maxMonsters = 4;

    // Sort by CER for better selection
    const sortedMonsters = [...monsters].sort((a, b) => b.cer - a.cer);

    while (totalCER < targetCER && result.length < maxMonsters) {
      const remainingCER = targetCER - totalCER;
      
      // Prefer monsters that use a good portion of remaining budget
      const affordableMonsters = sortedMonsters.filter(m => 
        m.cer <= remainingCER && m.cer >= remainingCER * 0.2
      );
      
      if (affordableMonsters.length === 0) {
        // Fallback to any affordable monster
        const fallbackMonsters = sortedMonsters.filter(m => m.cer <= remainingCER);
        if (fallbackMonsters.length === 0) break;
        
        const selected = fallbackMonsters[Math.floor(this.rng() * fallbackMonsters.length)];
        result.push(this.convertToMonster(selected));
        totalCER += selected.cer;
      } else {
        const selected = affordableMonsters[Math.floor(this.rng() * affordableMonsters.length)];
        result.push(this.convertToMonster(selected));
        totalCER += selected.cer;
      }
    }

    return {
      monsters: result,
      totalCER,
      encounterType: result.length === 1 ? 'single' : 'mixed'
    };
  }

  /**
   * Generate fallback encounter when no monsters match criteria
   */
  private generateFallbackEncounter(targetCER: number): GeneratedEncounter {
    const fallbackMonster: Monster = {
      name: 'Generic Threat',
      cer: Math.max(1, Math.round(targetCER)),
      challenge_level: this.getChallengeLevel(targetCER),
      tags: ['generic', 'fallback']
    };

    return {
      monsters: [fallbackMonster],
      totalCER: fallbackMonster.cer!,
      actualThreatLevel: 'Average',
      encounterType: 'single'
    };
  }

  /**
   * Convert DFRPGMonster to Monster interface
   */
  private convertToMonster(dfrpgMonster: DFRPGMonster): Monster {
    return {
      name: dfrpgMonster.name,
      cer: dfrpgMonster.cer,
      challenge_level: this.getChallengeLevel(dfrpgMonster.cer),
      tags: dfrpgMonster.tags,
      sm: dfrpgMonster.sm,
      frequency: dfrpgMonster.frequency,
      class: dfrpgMonster.class,
      subclass: dfrpgMonster.subclass,
      source: dfrpgMonster.source
    };
  }

  /**
   * Calculate human-readable challenge level from CER
   */
  private getChallengeLevel(cer: number): string {
    if (cer <= 0) return 'Trivial';
    if (cer <= 25) return 'Easy';
    if (cer <= 50) return 'Average';
    if (cer <= 100) return 'Challenging';
    if (cer <= 150) return 'Hard';
    return 'Epic';
  }

  /**
   * Calculate actual threat level based on generated encounter vs party strength
   */
  private calculateActualThreatLevel(encounterCER: number, partyCER: number): string {
    const ratio = encounterCER / partyCER;
    
    for (const [levelName, level] of Object.entries(THREAT_LEVELS)) {
      if (ratio >= level.minMultiplier && ratio <= level.maxMultiplier) {
        return levelName;
      }
    }
    
    // Handle edge cases
    if (ratio < 0.10) return 'Trivial';
    if (ratio > 10.00) return 'Epic';
    
    return 'Average';
  }
}

export default DFRPGMonsterGenerator;
