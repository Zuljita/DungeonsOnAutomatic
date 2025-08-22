import { Dungeon, Monster, SystemModule, Trap, Treasure } from '../../core/types';
import monstersData from './data/monsters-complete.js';
import { customDataLoader } from '../../services/custom-data-loader';
import { taggedSelectionService, TaggedSelectionOptions } from '../../services/tagged-selection';
import { DFRPGTreasureGenerator } from './DFRPGTreasure.js';
import { DFRPGEnhancedTrapSystem } from './DFRPGTrapsEnhanced.js';
import { DFRPGEnvironmentalSystem } from './DFRPGEnvironment.js';
import { DFRPGMonsterGenerator, type GenerateOptions, type DFRPGMonster } from './DFRPGMonsterGenerator';
import { DFRPGEncounterGenerator } from './DFRPGEncounterGenerator';
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
    

    // Initialize DFRPG systems
    const treasureGenerator = new DFRPGTreasureGenerator(R);
    const enhancedTrapSystem = new DFRPGEnhancedTrapSystem(R);
    const environmentalSystem = new DFRPGEnvironmentalSystem(R);
    const encounterGenerator = new DFRPGEncounterGenerator(R);
    const wanderingMonsterService = new WanderingMonsterService(R);
    const envService = createEnvironmentService(R);
    const defaultsService = new DungeonDefaultsService(R);

    // Generate overall dungeon environment details
    d.environment = envService.generate(true);

    // Use custom monsters if available, otherwise use default data
    let MONSTERS: Monster[];
    let DFRPG_MONSTERS: DFRPGMonster[];
    if (customDataLoader.hasCustomData('dfrpg', 'monsters')) {
      MONSTERS = customDataLoader.getMonsters('dfrpg');
      // For custom monsters, we'll need to convert them or work around this
      DFRPG_MONSTERS = []; // TODO: Handle custom monsters properly
      console.error(`Using ${MONSTERS.length} custom DFRPG monsters`);
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
            // Generate DFRPG treasure based on room danger and level
            const roomDanger = monsters.length + traps.length;
            const hoardSize = roomDanger >= 3 ? 'large' : roomDanger >= 2 ? 'medium' : 'small';
            const treasureHoard = treasureGenerator.generateTreasureHoard(dungeonLevel, hoardSize);
            
            // Create a single detailed treasure entry using the DFRPG treasure formatter
            const treasureDescription = treasureGenerator.formatTreasureDescription(treasureHoard, {
              format: 'detailed',
              showReferences: false,
              showWeights: true,
              useIcons: true,
              groupByType: true
            });
            
            treasure.push({
              kind: 'other',
              valueHint: treasureDescription.replace(/\n/g, '\n  ') // Indent for better formatting
            });
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
