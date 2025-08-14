import { Dungeon, Monster, SystemModule, Trap, Treasure } from '../../core/types';
import monstersData from './data/monsters-complete.js';
import { customDataLoader } from '../../services/custom-data-loader';
import { DFRPGTreasureGenerator } from './DFRPGTreasure.js';
import { DFRPGEnhancedTrapSystem } from './DFRPGTrapsEnhanced.js';
import { DFRPGEnvironmentalSystem } from './DFRPGEnvironment.js';

interface RawMonster {
  Description: string;
  Class?: string;
  SM?: number | null;
  Subclass?: string;
  Source1?: string;
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

export const dfrpg: SystemModule = {
  id: 'dfrpg',
  label: 'GURPS Dungeon Fantasy',
  enrich(d: Dungeon, opts?: { sources?: string[]; rng?: () => number; level?: number; useDFRPGTreasure?: boolean; useEnhancedTraps?: boolean; useEnvironmentalChallenges?: boolean; environmentComplexity?: 'minimal' | 'moderate' | 'challenging' | 'extreme' }): Dungeon {
    const R = opts?.rng ?? Math.random;
    const encounters = { ...d.encounters };
    const dungeonLevel = opts?.level ?? 1;
    const useDFRPGTreasure = opts?.useDFRPGTreasure ?? true;
    const useEnhancedTraps = opts?.useEnhancedTraps ?? true;
    const useEnvironmentalChallenges = opts?.useEnvironmentalChallenges ?? true;
    const environmentComplexity = opts?.environmentComplexity ?? 'moderate';
    
    // Initialize DFRPG systems
    const treasureGenerator = new DFRPGTreasureGenerator(R);
    const enhancedTrapSystem = new DFRPGEnhancedTrapSystem(R);
    const environmentalSystem = new DFRPGEnvironmentalSystem(R);

    // Use custom monsters if available, otherwise use default data
    let MONSTERS: Monster[];
    if (customDataLoader.hasCustomData('dfrpg', 'monsters')) {
      MONSTERS = customDataLoader.getMonsters('dfrpg');
      console.log(`Using ${MONSTERS.length} custom DFRPG monsters`);
    } else {
      // Original logic for default monsters
      let pool = RAW_MONSTERS;
      if (opts?.sources?.length) {
        const allowed = opts.sources.map((s) => s.toLowerCase());
        pool = pool.filter((m) =>
          m.Source1 && allowed.some((src) => m.Source1!.toLowerCase().includes(src))
        );
      }
      MONSTERS = pool.map((m) => ({
        name: m.Description,
        sm: m.SM ?? null,
        cls: m.Class,
        subclass: m.Subclass,
        source: m.Source1
      }));
    }

    // Use custom traps if available, otherwise use default data
    const CURRENT_TRAPS = customDataLoader.hasCustomData('dfrpg', 'traps') 
      ? customDataLoader.getTraps('dfrpg')
      : TRAPS;

    if (customDataLoader.hasCustomData('dfrpg', 'traps')) {
      console.log(`Using ${CURRENT_TRAPS.length} custom DFRPG traps`);
    }

    d.rooms.forEach((r) => {
      const monsters: Monster[] = [];
      const traps: Trap[] = [];
      const treasure: Treasure[] = [];

      const monsterCount = Math.floor(R() * 3);
      for (let i = 0; i < monsterCount; i++) {
        const m = MONSTERS[Math.floor(R() * MONSTERS.length)];
        if (m) monsters.push({ ...m });
      }

      if (R() < 0.3) {
        if (useEnhancedTraps && !customDataLoader.hasCustomData('dfrpg', 'traps')) {
          // Generate enhanced DFRPG trap
          const complexity = monsterCount >= 2 ? 'complex' : monsterCount >= 1 ? 'standard' : 'simple';
          const enhancedTrap = enhancedTrapSystem.generateTrap(dungeonLevel, complexity);
          
          traps.push({
            name: enhancedTrap.name,
            level: enhancedTrap.level,
            notes: `${enhancedTrap.trigger.details} | Detection: ${enhancedTrap.detection.modifiers} | Disarm: ${enhancedTrap.disarm.modifiers} | ${enhancedTrap.effect.damage || enhancedTrap.effect.affliction || enhancedTrap.effect.special}`
          });
        } else {
          // Use legacy or custom traps
          const t = CURRENT_TRAPS[Math.floor(R() * CURRENT_TRAPS.length)];
          traps.push({ ...t });
        }
      }

      if (R() < 0.5) {
        if (useDFRPGTreasure) {
          // Generate DFRPG treasure based on room danger and level
          const roomDanger = monsters.length + traps.length;
          const hoardSize = roomDanger >= 3 ? 'large' : roomDanger >= 2 ? 'medium' : 'small';
          const treasureHoard = treasureGenerator.generateTreasureHoard(dungeonLevel, hoardSize);
          
          // Convert to simple treasure format for compatibility
          if (treasureHoard.coins.totalValue > 0) {
            treasure.push({ 
              kind: 'coins', 
              valueHint: `$${treasureHoard.coins.totalValue} (${treasureHoard.coins.totalWeight.toFixed(1)} lbs)` 
            });
          }
          
          treasureHoard.magicItems.forEach(item => {
            treasure.push({
              kind: 'magic',
              valueHint: `${item.name} ($${item.value}, ${item.weight} lbs) - ${item.quirks.join(', ')}`
            });
          });
          
          treasureHoard.mundaneItems.forEach(item => {
            treasure.push({
              kind: item.category === 'art' ? 'art' : item.category === 'gem' ? 'gems' : 'other',
              valueHint: `${item.name} ($${item.value}, ${item.weight} lbs)${item.description ? ' - ' + item.description : ''}`
            });
          });
        } else {
          // Legacy simple treasure
          const t = SIMPLE_TREASURE[Math.floor(R() * SIMPLE_TREASURE.length)];
          treasure.push({ ...t });
        }
      }

      encounters[r.id] = { monsters, traps, treasure };
    });

    // Add environmental challenges to rooms
    const modifiedRooms = d.rooms.map((room) => {
      const newTags = [...(room.tags || [])];
      
      if (useEnvironmentalChallenges) {
        // Generate comprehensive environmental challenges
        const environment = environmentalSystem.generateRoomEnvironment(
          room.kind,
          dungeonLevel,
          environmentComplexity
        );
        
        if (environment.modifiers.length > 0) {
          // Add environmental tags
          newTags.push(`gurps:environment:${environment.description}`);
          environment.tacticalNotes.forEach(note => {
            newTags.push(`gurps:tactical:${note}`);
          });
          newTags.push(`gurps:challenge_level:${environment.totalPenalty}`);
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
      
      return newTags.length > (room.tags?.length || 0) ? { ...room, tags: newTags } : room;
    });

    return { ...d, rooms: modifiedRooms, encounters };
  }
};

export default dfrpg;

export { dfrpgLockService } from "./locks";
export { DFRPGTraps } from "./DFRPGTraps";
export { DFRPGTreasureGenerator } from "./DFRPGTreasure";
export { DFRPGEnhancedTrapSystem } from "./DFRPGTrapsEnhanced";
export { DFRPGEnvironmentalSystem } from "./DFRPGEnvironment";
