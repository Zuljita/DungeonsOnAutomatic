import { Dungeon, Monster, SystemModule, Trap, Treasure } from '../../core/types';
import monstersData from './data/monsters-complete.js';
import { customDataLoader } from '../../services/custom-data-loader';
import { DFRPGTreasureGenerator } from './DFRPGTreasure.js';

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

const ROOM_MODIFIERS = {
  environmental: [
    { tag: 'darkness', description: 'Dark (-5 to vision rolls)', weight: 3 },
    { tag: 'dim_light', description: 'Dim lighting (-2 to vision rolls)', weight: 2 },
    { tag: 'bad_footing', description: 'Slippery/rough floor (-2 to Move, attack, and defense)', weight: 2 },
    { tag: 'cramped', description: 'Low ceiling/narrow space (no retreating, -2 to swinging weapons)', weight: 1 },
    { tag: 'damp', description: 'Wet and moldy (+1 to disease resistance rolls needed)', weight: 2 },
    { tag: 'cold', description: 'Freezing conditions (HT rolls vs cold)', weight: 1 },
    { tag: 'hot', description: 'Sweltering heat (HT rolls vs heat)', weight: 1 }
  ],
  tactical: [
    { tag: 'high_ground', description: 'Elevated position (+1 to attack from above)', weight: 1 },
    { tag: 'cover', description: 'Pillars/debris provide cover (+2 to +4 defense)', weight: 2 },
    { tag: 'choke_point', description: 'Narrow entrance (limits attackers to 1-2 at a time)', weight: 1 },
    { tag: 'multiple_exits', description: 'Several escape routes available', weight: 2 },
    { tag: 'echo_chamber', description: 'Sound carries (+3 to Hearing rolls, -2 to Stealth)', weight: 1 }
  ]
};

export const dfrpg: SystemModule = {
  id: 'dfrpg',
  label: 'GURPS Dungeon Fantasy',
  enrich(d: Dungeon, opts?: { sources?: string[]; rng?: () => number; level?: number; useDFRPGTreasure?: boolean }): Dungeon {
    const R = opts?.rng ?? Math.random;
    const encounters = { ...d.encounters };
    const dungeonLevel = opts?.level ?? 1;
    const useDFRPGTreasure = opts?.useDFRPGTreasure ?? true;
    
    // Initialize DFRPG treasure generator
    const treasureGenerator = new DFRPGTreasureGenerator(R);

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
        const t = CURRENT_TRAPS[Math.floor(R() * CURRENT_TRAPS.length)];
        traps.push({ ...t });
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

    // Add GURPS room modifiers
    const modifiedRooms = d.rooms.map((room) => {
      const newTags = [...(room.tags || [])];
      
      // 40% chance for environmental modifier
      if (R() < 0.4) {
        const envModifiers = ROOM_MODIFIERS.environmental;
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
      
      // 30% chance for tactical modifier  
      if (R() < 0.3) {
        const tacticalModifiers = ROOM_MODIFIERS.tactical;
        const totalWeight = tacticalModifiers.reduce((sum, mod) => sum + mod.weight, 0);
        let random = R() * totalWeight;
        
        for (const modifier of tacticalModifiers) {
          random -= modifier.weight;
          if (random <= 0) {
            newTags.push(`gurps:${modifier.tag}`, `gurps:${modifier.description}`);
            break;
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
