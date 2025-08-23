import { Dungeon, Monster, SystemModule, Trap, Treasure } from '../../core/types';
import monstersData from './data/monsters-complete.js';
import { customDataLoader } from '../../services/custom-data-loader';
import { taggedSelectionService, TaggedSelectionOptions } from '../../services/tagged-selection';
import { DFRPGTreasureGenerator } from './DFRPGTreasure.js';
import { DFRPGEnhancedTrapSystem } from './DFRPGTrapsEnhanced.js';
import { DFRPGEnvironmentalSystem } from './DFRPGEnvironment.js';
import { DFRPGMonsterGenerator, type GenerateOptions, type DFRPGMonster } from './DFRPGMonsterGenerator';
import { DFRPGEncounterGenerator } from './DFRPGEncounterGenerator';
import { EncounterBalanceService, type BalancedTreasureOptions } from './EncounterBalanceService';
import { LockService, type LockGenerationOptions } from '../../services/locks';
import { createKeyItemService, type KeyPlacementOptions } from '../../services/key-items';
import { validateDungeonSolvability } from '../../services/pathfinder';
import { WanderingMonsterService } from '../../services/wandering-monster-service';
import { createEnvironmentService } from '../../services/environment';
import { DungeonDefaultsService } from '../../services/dungeon-defaults';

interface RawMonster {
  Description: string;
  Class?: string;
  SM?: number | null;
  Subclass?: string;
  Environment?: string;
  Source1?: string;
  Page1?: string | null;
  CER?: number;
}

const RAW_MONSTERS: RawMonster[] = monstersData as RawMonster[];

const TRAPS: Trap[] = [
  { name: 'Pit Trap', level: 1 },
  { name: 'Arrow Trap', level: 2 },
  { name: 'Poison Gas', level: 3 },
  { name: 'Collapsing Ceiling', level: 4 }
];

const TREASURE: Treasure[] = [
  { kind: 'coins', valueHint: 'minor' },
  { kind: 'gems', valueHint: 'standard' },
  { kind: 'magic', valueHint: 'major' },
  { kind: 'art', valueHint: 'minor' }
];

// Legacy treasure for backward compatibility
const SIMPLE_TREASURE = TREASURE;

// Legacy room modifiers for backward compatibility
const SIMPLE_ROOM_MODIFIERS = {
  environmental: [
    { tag: 'darkness', description: 'Dark (-5 to vision rolls)', weight: 3 },
    { tag: 'dim_light', description: 'Dim lighting (-2 to vision rolls)', weight: 2 },
    { tag: 'bad_footing', description: 'Slippery/rough floor (-2 to Move, attack, and defense)', weight: 2 },
    { tag: 'cramped', description: 'Low ceiling/narrow space (no retreating, -2 to swinging weapons)', weight: 1 }
  ]
};

// Helper function to generate tags for monsters based on their data
function getMonsterTags(monster: RawMonster): string[] {
  const tags: string[] = [];
  
  // Add class-based tags
  if (monster.Class) {
    const className = monster.Class.toLowerCase();
    if (className.includes('undead')) tags.push('undead');
    if (className.includes('dragon')) tags.push('dragon', 'scaled');
    if (className.includes('elemental')) tags.push('elemental', 'magical');
    if (className.includes('humanoid')) tags.push('humanoid');
    if (className.includes('animal')) tags.push('animal', 'wildlife');
    if (className.includes('goblin')) tags.push('goblin', 'chaotic');
    if (className.includes('orc')) tags.push('orc', 'brutal');
  }
  
  // Add subclass-based tags
  if (monster.Subclass) {
    const subclassName = monster.Subclass.toLowerCase();
    if (subclassName.includes('fire')) tags.push('fire', 'elemental');
    if (subclassName.includes('water')) tags.push('water', 'elemental');
    if (subclassName.includes('earth')) tags.push('earth', 'elemental');
    if (subclassName.includes('air')) tags.push('air', 'elemental');
    if (subclassName.includes('skeleton')) tags.push('undead', 'skeleton');
    if (subclassName.includes('zombie')) tags.push('undead', 'zombie');
    if (subclassName.includes('ghost')) tags.push('undead', 'ghost');
  }
  
  // Add source-based tags
  if (monster.Source1) {
    const sourceName = monster.Source1.toLowerCase();
    if (sourceName.includes('cult')) tags.push('cult', 'evil');
    if (sourceName.includes('wizard')) tags.push('wizard', 'arcane');
    if (sourceName.includes('dragon')) tags.push('dragon', 'majestic');
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

// Helper function to calculate challenge level from CER
function getChallengeLevel(cer: number): string {
  if (cer <= 0) return 'Trivial';
  if (cer <= 25) return 'Easy';
  if (cer <= 50) return 'Moderate';
  if (cer <= 75) return 'Hard';
  if (cer <= 100) return 'Very Hard';
  if (cer <= 150) return 'Extreme';
  if (cer <= 200) return 'Epic';
  return 'Legendary';
}

// Helper function to get threat rating from CER
function getThreatRating(cer: number): 'fodder' | 'worthy' | 'boss' {
  if (cer <= 25) return 'fodder';
  if (cer <= 100) return 'worthy';
  return 'boss';
}

// Helper function to convert Monster[] to DFRPGMonster[] for custom monsters
function convertToDFRPGMonsters(monsters: Monster[]): DFRPGMonster[] {
  return monsters.map(monster => {
    // Extract CER, defaulting to 0 if not provided
    const cer = typeof monster.cer === 'number' ? monster.cer : 0;
    
    // Extract SM, handling both property variations
    const sm = typeof monster.sm === 'number' ? monster.sm : null;
    
    // Generate tags using the existing logic, adapted for Monster format
    const tags = generateTagsForCustomMonster(monster);
    
    // Parse biome from existing tags or default to dungeon
    const biome = extractBiomeFromTags(monster.tags) || ['dungeon'];
    
    // Calculate frequency based on CER (using same logic as default monsters)
    const frequency: 'very_rare' | 'rare' | 'uncommon' | 'common' | 'very_common' =
      cer >= 150 ? 'very_rare' :
      cer >= 100 ? 'rare' :
      cer >= 50 ? 'uncommon' :
      cer >= 25 ? 'common' : 'very_common';

    return {
      name: monster.name,
      cer,
      sm,
      tags,
      biome,
      frequency,
      class: monster.cls || monster.class || '',
      subclass: monster.subclass || '',
      source: monster.source || 'Custom Import'
    };
  });
}

// Helper to generate tags for custom monsters (adapted from getMonsterTags)
function generateTagsForCustomMonster(monster: Monster): string[] {
  const tags: string[] = [];
  
  // Use existing tags if provided
  if (monster.tags && Array.isArray(monster.tags)) {
    tags.push(...monster.tags);
  }
  
  // Generate tags from class (handle both cls and class properties)
  const monsterClass = monster.cls || monster.class || '';
  if (monsterClass) {
    const className = monsterClass.toLowerCase();
    if (className.includes('undead')) tags.push('undead');
    if (className.includes('dragon')) tags.push('dragon', 'scaled');
    if (className.includes('elemental')) tags.push('elemental', 'magical');
    if (className.includes('humanoid')) tags.push('humanoid');
    if (className.includes('animal')) tags.push('animal', 'wildlife');
    if (className.includes('goblin')) tags.push('goblin', 'chaotic');
    if (className.includes('orc')) tags.push('orc', 'brutal');
  }
  
  // Generate tags from subclass
  if (monster.subclass) {
    const subclassName = monster.subclass.toLowerCase();
    if (subclassName.includes('fire')) tags.push('fire', 'elemental');
    if (subclassName.includes('water')) tags.push('water', 'elemental');
    if (subclassName.includes('earth')) tags.push('earth', 'elemental');
    if (subclassName.includes('air')) tags.push('air', 'elemental');
    if (subclassName.includes('skeleton')) tags.push('undead', 'skeleton');
    if (subclassName.includes('zombie')) tags.push('undead', 'zombie');
    if (subclassName.includes('ghost')) tags.push('undead', 'ghost');
  }
  
  // Generate tags from source
  if (monster.source) {
    const sourceName = monster.source.toLowerCase();
    if (sourceName.includes('cult')) tags.push('cult', 'evil');
    if (sourceName.includes('wizard')) tags.push('wizard', 'arcane');
    if (sourceName.includes('dragon')) tags.push('dragon', 'majestic');
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

// Helper to extract biome information from existing tags or provide defaults
function extractBiomeFromTags(tags?: string[]): string[] | null {
  if (!tags || !Array.isArray(tags)) return null;
  
  const biomeKeywords = [
    'aquatic', 'desert', 'forest', 'mountain', 'swamp', 'cave', 'dungeon',
    'urban', 'arctic', 'plains', 'underground', 'volcanic', 'ethereal'
  ];
  
  const foundBiomes = tags.filter(tag => 
    biomeKeywords.some(biome => tag.toLowerCase().includes(biome))
  );
  
  return foundBiomes.length > 0 ? foundBiomes.map(b => b.toLowerCase()) : null;
}

export const dfrpg: SystemModule = {
  id: 'dfrpg',
  label: 'GURPS Dungeon Fantasy',
  async enrich(
    d: Dungeon,
    opts?: {
      sources?: string[];
      rng?: () => number;
      level?: number;
      useDFRPGTreasure?: boolean;
      useEnhancedTraps?: boolean;
      useEnvironmentalChallenges?: boolean;
      environmentComplexity?: 'minimal' | 'moderate' | 'challenging' | 'extreme';
      tags?: TaggedSelectionOptions;
      lockOptions?: LockGenerationOptions;
      treasureBalance?: BalancedTreasureOptions;
    },
  ): Promise<Dungeon> {
    const R = opts?.rng ?? Math.random;
    const encounters = { ...d.encounters };
    const dungeonLevel = opts?.level ?? 1;
    const useDFRPGTreasure = opts?.useDFRPGTreasure ?? true;
    const useEnhancedTraps = opts?.useEnhancedTraps ?? true;
    const useEnvironmentalChallenges = opts?.useEnvironmentalChallenges ?? true;
    const environmentComplexity = opts?.environmentComplexity ?? 'moderate';
    const tagOptions = opts?.tags;
    const treasureBalanceOptions = opts?.treasureBalance;
    

    // Initialize DFRPG systems
    const treasureGenerator = new DFRPGTreasureGenerator(R);
    const enhancedTrapSystem = new DFRPGEnhancedTrapSystem(R);
    const environmentalSystem = new DFRPGEnvironmentalSystem(R);
    const encounterGenerator = new DFRPGEncounterGenerator(R);
    const wanderingMonsterService = new WanderingMonsterService(R);
    const envService = createEnvironmentService(R);
    const defaultsService = new DungeonDefaultsService(R);
    const balanceService = new EncounterBalanceService(R);

    // Generate overall dungeon environment details
    d.environment = envService.generate(true);

    // Use custom monsters if available, otherwise use default data
    let MONSTERS: Monster[];
    let DFRPG_MONSTERS: DFRPGMonster[];
    if (customDataLoader.hasCustomData('dfrpg', 'monsters')) {
      MONSTERS = customDataLoader.getMonsters('dfrpg');
      // Convert custom monsters to DFRPG format for the encounter generator
      DFRPG_MONSTERS = convertToDFRPGMonsters(MONSTERS);
      console.error(`Using ${MONSTERS.length} custom DFRPG monsters, converted ${DFRPG_MONSTERS.length} for encounters`);
    } else {
      // Original logic for default monsters
      let pool = RAW_MONSTERS;
      if (opts?.sources?.length) {
        const allowed = opts.sources.map((s) => s.toLowerCase());
        pool = pool.filter((m) =>
          m.Source1 && allowed.some((src) => m.Source1!.toLowerCase().includes(src))
        );
      }
      // Convert filtered raw monsters to DFRPG monster format
      DFRPG_MONSTERS = pool.map((m) => {
        const cer = typeof m.CER === 'number' ? m.CER : 0;
        const sm = typeof m.SM === 'number' ? m.SM : null;
        const tags = getMonsterTags(m);
        
        // Parse biome/environment data (using same logic as data/monsters.ts)
        const biome = typeof m.Environment === 'string' && m.Environment.trim()
          ? m.Environment.split(/,\s*/).map((b: string) => b.toLowerCase().trim()).filter(b => b.length > 0)
          : ['dungeon']; // Default to dungeon if no environment specified
        
        // Calculate frequency based on CER (same logic as data/monsters.ts)
        const frequency: 'very_rare' | 'rare' | 'uncommon' | 'common' | 'very_common' =
          cer >= 150
            ? 'very_rare'
            : cer >= 100
              ? 'rare'
              : cer >= 50
                ? 'uncommon'
                : cer >= 25
                  ? 'common'
                  : 'very_common';

        return {
          name: m.Description,
          cer,
          sm,
          tags,
          biome,
          frequency,
          class: m.Class || '',
          subclass: m.Subclass || '',
          source: m.Source1 || ''
        };
      });
      MONSTERS = pool.map((m) => {
        const cer = (typeof m.CER === 'number') ? m.CER : 0;
        return {
          name: m.Description,
          sm: m.SM ?? null,
          cls: m.Class,
          subclass: m.Subclass,
          source: m.Source1,
          reference: m.Page1 ? `${m.Source1} p.${m.Page1}` : m.Source1,
          tags: getMonsterTags(m), // Add tags based on monster data
          cer: cer, // Challenge Equivalent Rating
          challenge_level: getChallengeLevel(cer),
          threat_rating: getThreatRating(cer)
        };
      });
    }

    // Recreate the encounter generator with filtered monsters
    const filteredEncounterGenerator = new DFRPGEncounterGenerator(R, DFRPG_MONSTERS);

    // Use custom traps if available, otherwise use default data
    const CURRENT_TRAPS = customDataLoader.hasCustomData('dfrpg', 'traps') 
      ? customDataLoader.getTraps('dfrpg')
      : TRAPS;

    if (customDataLoader.hasCustomData('dfrpg', 'traps')) {
      console.error(`Using ${CURRENT_TRAPS.length} custom DFRPG traps`);
    }

    d.rooms.forEach((r) => {
      // Apply room tags if tag options are provided
      if (tagOptions) {
        taggedSelectionService.applyRoomTags(r, tagOptions, R);
      }
      
      const monsters: Monster[] = [];
      const traps: Trap[] = [];
      const treasure: Treasure[] = [];

      // Select monsters using new encounter system or fallback to original logic
      if (tagOptions || R() < 0.6) {
        // 60% chance to use new encounter system or when tags are specified
        const encounterOptions: GenerateOptions = {
          characterPoints: 100, // Default party strength
          threatLevel: dungeonLevel <= 2 ? 'Easy' : dungeonLevel <= 4 ? 'Average' : 'Challenging',
          biome: 'dungeon',
          maxSize: 2, // Reasonable for dungeon rooms
          preferGroupedEncounters: true,
          requiredTags: tagOptions?.monsters?.requiredTags || []
        };
        
        const encounter = filteredEncounterGenerator.generate(encounterOptions);
        monsters.push(...encounter.monsters);
      } else {
        // Fallback to legacy monster selection
        if (tagOptions) {
          monsters.push(...taggedSelectionService.selectMonsters('dfrpg', tagOptions, R));
        } else {
          const monsterCount = Math.floor(R() * 3);
          if (MONSTERS && MONSTERS.length > 0) {
            for (let i = 0; i < monsterCount; i++) {
              const m = MONSTERS[Math.floor(R() * MONSTERS.length)];
              if (m) monsters.push({ ...m });
            }
          } else {
            console.error('DFRPG: MONSTERS array is empty or undefined', MONSTERS);
          }
        }
      }

      // Select traps using tag system or fallback to original logic
      if (tagOptions) {
        traps.push(...taggedSelectionService.selectTraps('dfrpg', tagOptions, R));
      } else {
        if (R() < 0.3) {
          if (useEnhancedTraps && !customDataLoader.hasCustomData('dfrpg', 'traps')) {
            // Generate enhanced DFRPG trap
            const complexity = monsters.length >= 2 ? 'complex' : monsters.length >= 1 ? 'standard' : 'simple';
            const enhancedTrap = enhancedTrapSystem.generateTrap(dungeonLevel, complexity);
            
            traps.push({
              name: enhancedTrap.name,
              level: enhancedTrap.level,
              notes: `${enhancedTrap.trigger.details} | Detection: ${enhancedTrap.detection.modifiers} | Disarm: ${enhancedTrap.disarm.modifiers} | ${enhancedTrap.effect.damage || enhancedTrap.effect.affliction || enhancedTrap.effect.special}`
            });
          } else {
            // Use legacy or custom traps
            if (CURRENT_TRAPS && CURRENT_TRAPS.length > 0) {
              const t = CURRENT_TRAPS[Math.floor(R() * CURRENT_TRAPS.length)];
              traps.push({ ...t });
            } else {
              console.error('DFRPG: CURRENT_TRAPS array is empty or undefined', CURRENT_TRAPS);
            }
          }
        }
      }

      // Select treasure using tag system or fallback to original logic
      if (tagOptions) {
        treasure.push(...taggedSelectionService.selectTreasure('dfrpg', tagOptions, monsters.length > 0, R));
      } else {
        if (R() < 0.5) {
          if (useDFRPGTreasure) {
            // Generate DFRPG treasure with encounter balancing if enabled
            let treasureHoard;
            
            if (treasureBalanceOptions?.useEncounterBalancing) {
              // Use new encounter balance system
              const risk = balanceService.assessEncounterRisk(monsters, traps, r);
              const targetValue = balanceService.calculateTargetTreasureValue(risk, dungeonLevel, treasureBalanceOptions);
              
              // Generate base hoard then adjust for encounter risk
              const roomDanger = monsters.length + traps.length;
              const hoardSize = roomDanger >= 3 ? 'large' : roomDanger >= 2 ? 'medium' : 'small';
              const baseHoard = treasureGenerator.generateTreasureHoard(dungeonLevel, hoardSize);
              
              treasureHoard = balanceService.adjustTreasureForRisk(baseHoard, targetValue, risk, treasureBalanceOptions);
              
              console.error(`DFRPG Balance: Room ${r.id} (${risk.roomType}, ${risk.riskRating} risk) - Target: $${targetValue}, Generated: $${treasureHoard.totalValue}`);
            } else {
              // Original treasure generation logic
              const roomDanger = monsters.length + traps.length;
              const hoardSize = roomDanger >= 3 ? 'large' : roomDanger >= 2 ? 'medium' : 'small';
              treasureHoard = treasureGenerator.generateTreasureHoard(dungeonLevel, hoardSize);
            }
            
            // Store the rich treasure data while maintaining backward compatibility
            if (treasureHoard.totalValue > 0) {
              // Add a special treasure entry that contains the full hoard data
              treasure.push({
                kind: 'dfrpg_hoard',
                valueHint: `Enhanced treasure (Total: $${treasureHoard.totalValue}, ${treasureHoard.totalWeight.toFixed(1)} lbs)`,
                // Store the full hoard as additional data
                ...treasureHoard
              } as any);
              
              // Also add basic compatibility entries for systems that don't support enhanced display
              if (treasureHoard.coins.totalValue > 0) {
                treasure.push({ 
                  kind: 'coins', 
                  valueHint: `$${treasureHoard.coins.totalValue} (${treasureHoard.coins.totalWeight.toFixed(1)} lbs)` 
                });
              }
              
              treasureHoard.magicItems.forEach(item => {
                treasure.push({
                  kind: 'magic',
                  valueHint: `${item.name} ($${item.value}, ${item.weight} lbs) - ${item.quirks?.join(', ') || 'No quirks'}`
                });
              });
              
              treasureHoard.mundaneItems.forEach(item => {
                treasure.push({
                  kind: item.category === 'art' ? 'art' : item.category === 'gem' ? 'gems' : 'other',
                  valueHint: `${item.name} ($${item.value}, ${item.weight} lbs)${item.description ? ' - ' + item.description : ''}`
                });
              });
            }
          } else {
            // Legacy simple treasure
            if (SIMPLE_TREASURE && SIMPLE_TREASURE.length > 0) {
              const t = SIMPLE_TREASURE[Math.floor(R() * SIMPLE_TREASURE.length)];
              treasure.push({ ...t });
            } else {
              console.error('DFRPG: SIMPLE_TREASURE array is empty or undefined', SIMPLE_TREASURE);
            }
          }
        }
      }

      encounters[r.id] = { monsters, traps, treasure };
    });

    // Generate wandering monsters based on monsters placed in the dungeon
    const tempDungeon = { ...d, encounters };
    const wanderingMonsters = wanderingMonsterService.generateWanderingMonsters(tempDungeon);
    if (wanderingMonsters.length > 0) {
      console.error(`DFRPG: Generated ${wanderingMonsters.length} wandering monster entries`);
    }

    // Generate dungeon defaults (name, mana level, sanctity, nature's strength)
    const dungeonDefaults = defaultsService.generateDefaults();
    console.error(`DFRPG: Generated dungeon "${dungeonDefaults.name}" with mana: ${dungeonDefaults.manaLevel}, sanctity: ${dungeonDefaults.sanctity}, nature: ${dungeonDefaults.nature}`);

    // Add environmental challenges to rooms
    const modifiedRooms = d.rooms.map((room) => {
      const newTags = [...(room.tags || [])];
      
      if (useEnvironmentalChallenges) {
        // Generate comprehensive environmental challenges
        // Map special room types to basic 'special' for environmental system
        const roomKind = ['exit to upper level', 'entrance to lower level', 'dungeon entrance'].includes(room.kind) 
          ? 'special' as const 
          : room.kind as 'chamber' | 'hall' | 'cavern' | 'lair' | 'special';
        const environment = environmentalSystem.generateRoomEnvironment(
          roomKind,
          dungeonLevel,
          environmentComplexity
        );
        
        if (environment.modifiers.length > 0) {
          // Add semantic environmental tags from the modifier data
          environment.modifiers.forEach(modifier => {
            newTags.push(modifier.tag); // Use the semantic tag like 'water_knee_deep', 'icy_floor', etc.
            newTags.push(modifier.category); // terrain, visibility, space, atmospheric, magical
            newTags.push(modifier.severity); // minor, moderate, severe, extreme
          });
          
          // Add challenge level as a separate tag
          if (environment.totalPenalty > 0) {
            newTags.push(`challenge_level_${environment.totalPenalty}`);
          }
          
          // Store the environmental description with tactical rules on the room
          const descriptions = [environment.description];
          if (environment.tacticalNotes.length > 0) {
            descriptions.push(`Tactical Effects: ${environment.tacticalNotes.join('; ')}`);
          }
          room.description = descriptions.join('. ');
        }
      } else {
        // Fall back to simple room modifiers for backward compatibility
        if (R() < 0.4) {
          const envModifiers = SIMPLE_ROOM_MODIFIERS.environmental;
          const totalWeight = envModifiers.reduce((sum, mod) => sum + mod.weight, 0);
          let random = R() * totalWeight;
          
          for (const modifier of envModifiers) {
            random -= modifier.weight;
            if (random <= 0) {
              newTags.push(`gurps:${modifier.tag}`, `gurps:${modifier.description}`);
              break;
            }
          }
        }
      }
      
      // Return modified room if tags or description changed
      const hasNewTags = newTags.length > (room.tags?.length || 0);
      const hasDescription = Boolean(room.description);
      
      if (hasNewTags || hasDescription) {
        return { ...room, tags: newTags, description: room.description };
      }
      
      return room;
    });

    // Generate locks and keys for the dungeon
    const lockGenerationOptions: LockGenerationOptions = {
      lockPercentage: 0.3, // 30% of doors get locks
      preferImportantDoors: true,
      allowMagicalLocks: true, // DFRPG supports magical locks
      ...(opts?.lockOptions || {}),
    };

    const keyPlacementOptions: KeyPlacementOptions = {
      preferMonsterLoot: true,
      allowRoomFeatures: true,
      ensureAccessibility: true
    };

    // Create services with dungeon's RNG for consistency
    const lockService = new LockService(R);
    const keyItemService = createKeyItemService(R);

    let enrichedDungeon = { ...d, rooms: modifiedRooms, encounters, wanderingMonsters, defaults: dungeonDefaults };

    // Generate locks for doors
    const locks = lockService.generateLocks(enrichedDungeon, lockGenerationOptions);
    
    if (locks.length > 0) {
      console.error(`DFRPG: Generated ${locks.length} locks for doors`);
      
      // Create keys for the locks
      const keys = keyItemService.createKeysForLocks(locks);
      console.error(`DFRPG: Created ${keys.length} keys`);
      
      // Place keys strategically in the dungeon
      keyItemService.placeKeys(enrichedDungeon, keys, keyPlacementOptions);
      console.error(`DFRPG: Placed keys in rooms`);
      
      // Validate that the dungeon is solvable
      const validation = validateDungeonSolvability(enrichedDungeon);
      
      if (!validation.solvable) {
        console.warn(`DFRPG: ${validation.message} - Attempting smart key relocation`);
        
        // Import the new fix functions
        const { fixDungeonSolvability, createFallbackSolutions } = await import('../../services/pathfinder');
        
        // First attempt: smart key relocation
        const fixed = fixDungeonSolvability(enrichedDungeon);
        
        if (fixed) {
          console.error('DFRPG: Successfully fixed dungeon solvability with key relocation');
        } else {
          console.warn('DFRPG: Key relocation failed - adding fallback solutions');
          
          // Second attempt: add fallback solutions (master key, breakable doors)
          createFallbackSolutions(enrichedDungeon);
          
          // Final validation
          const finalValidation = validateDungeonSolvability(enrichedDungeon);
          if (finalValidation.solvable) {
            console.error('DFRPG: Dungeon made solvable with fallback solutions');
          } else {
            console.warn('DFRPG: Could not ensure dungeon solvability - manual intervention may be needed');
          }
        }
      } else {
        console.error('DFRPG: Dungeon is solvable with key placement');
      }
    }

    return enrichedDungeon;
  }
};

export default dfrpg;

export { dfrpgLockService } from "./locks";
export { DFRPGTraps } from "./DFRPGTraps";
export { DFRPGTreasureGenerator } from "./DFRPGTreasure";
export { DFRPGTreasureItemGenerator } from "./DFRPGTreasureItem";
export { DFRPGEnhancedTrapSystem } from "./DFRPGTrapsEnhanced";
export { DFRPGEnvironmentalSystem } from "./DFRPGEnvironment";
export { DFRPGMonsterGenerator } from "./DFRPGMonsterGenerator";
export { DFRPGEncounterGenerator } from "./DFRPGEncounterGenerator";
