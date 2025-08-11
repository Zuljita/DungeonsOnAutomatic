import { Dungeon, Monster, SystemModule, Trap, Treasure } from '../../core/types.js';

const MONSTERS: Monster[] = [
  { name: 'Goblin', sm: -1, cls: 'Humanoid', subclass: 'Goblinoid' },
  { name: 'Orc', sm: 0, cls: 'Humanoid', subclass: 'Orc' },
  { name: 'Giant Spider', sm: 0, cls: 'Animal', subclass: 'Vermin' },
  { name: 'Fire Dragon', sm: 4, cls: 'Dragon', subclass: 'Fire' }
];

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

export const dfrpg: SystemModule = {
  id: 'dfrpg',
  label: 'GURPS Dungeon Fantasy',
  enrich(d: Dungeon): Dungeon {
    const encounters = { ...d.encounters };

    d.rooms.forEach((r) => {
      const monsters: Monster[] = [];
      const traps: Trap[] = [];
      const treasure: Treasure[] = [];

      const monsterCount = Math.floor(Math.random() * 3);
      for (let i = 0; i < monsterCount; i++) {
        const m = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
        if (m) monsters.push({ ...m });
      }

      if (Math.random() < 0.3) {
        const t = TRAPS[Math.floor(Math.random() * TRAPS.length)];
        traps.push({ ...t });
      }

      if (Math.random() < 0.5) {
        const t = TREASURE[Math.floor(Math.random() * TREASURE.length)];
        treasure.push({ ...t });
      }

      encounters[r.id] = { monsters, traps, treasure };
    });

    return { ...d, encounters };
  }
};

export default dfrpg;
