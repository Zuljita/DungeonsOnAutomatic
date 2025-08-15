import { Dungeon, SystemModule, Monster, Trap, Treasure } from '../core/types';
import { customDataLoader } from '../services/custom-data-loader';
import { taggedSelectionService, TaggedSelectionOptions } from '../services/tagged-selection';

export const generic: SystemModule = {
  id: 'generic',
  label: 'Generic (no system)',
  enrich(d: Dungeon, opts?: Record<string, unknown>): Dungeon {
    const tagOptions = opts?.tags as TaggedSelectionOptions;
    const encounters = { ...d.encounters };
    const R = d.rng || (() => Math.random());
    
    d.rooms.forEach((room) => {
      // Apply room tags if tag options are provided
      if (tagOptions) {
        taggedSelectionService.applyRoomTags(room, tagOptions, R);
      }
      
      const roomEncounter = encounters[room.id] || { monsters: [], traps: [], treasure: [] };
      
      // Select monsters using tag system
      const monsters = tagOptions 
        ? taggedSelectionService.selectMonsters('generic', tagOptions, R)
        : selectDefaultMonsters(R);
      
      // Select traps using tag system
      const traps = tagOptions
        ? taggedSelectionService.selectTraps('generic', tagOptions, R)
        : selectDefaultTraps(R);
      
      // Select treasure using tag system
      const treasure = tagOptions
        ? taggedSelectionService.selectTreasure('generic', tagOptions, monsters.length > 0, R)
        : selectDefaultTreasure(monsters.length > 0, R);
      
      roomEncounter.monsters = monsters;
      roomEncounter.traps = traps;
      roomEncounter.treasure = treasure;
      
      encounters[room.id] = roomEncounter;
    });
    
    return { ...d, encounters };
  }
};

// Helper functions for default selection
function selectDefaultMonsters(R: () => number): Monster[] {
  const monsters: Monster[] = [];
  if (R() < 0.4) {
    const defaultMonsters = [
      { name: 'Goblin', cls: 'Humanoid', tags: ['goblin', 'humanoid', 'chaotic'] },
      { name: 'Skeleton', cls: 'Undead', tags: ['undead', 'skeleton', 'cold'] },
      { name: 'Orc', cls: 'Humanoid', tags: ['orc', 'humanoid', 'brutal'] }
    ];
    const monster = defaultMonsters[Math.floor(R() * defaultMonsters.length)];
    monsters.push({ ...monster });
  }
  return monsters;
}

function selectDefaultTraps(R: () => number): Trap[] {
  const traps: Trap[] = [];
  if (R() < 0.2) {
    const defaultTraps = [
      { name: 'Pit Trap', level: 1, tags: ['mechanical', 'pit', 'falling'] },
      { name: 'Arrow Trap', level: 2, tags: ['mechanical', 'projectile'] }
    ];
    const trap = defaultTraps[Math.floor(R() * defaultTraps.length)];
    traps.push({ ...trap });
  }
  return traps;
}

function selectDefaultTreasure(hasMonsters: boolean, R: () => number): Treasure[] {
  const treasure: Treasure[] = [];
  const chance = hasMonsters ? 0.6 : 0.3;
  if (R() < chance) {
          const defaultTreasure = [
        { kind: 'coins' as const, valueHint: 'minor', tags: ['coins', 'mundane'] },
        { kind: 'gems' as const, valueHint: 'standard', tags: ['gems', 'precious'] }
      ];
      const item = defaultTreasure[Math.floor(R() * defaultTreasure.length)];
      treasure.push({ ...item });
  }
  return treasure;
}

export default generic;
