import { Dungeon, Monster, SystemModule, Trap, Treasure } from '../../core/types';
import monstersData from './data/monsters-complete.js';

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

export const dfrpg: SystemModule = {
  id: 'dfrpg',
  label: 'GURPS Dungeon Fantasy',
  enrich(
    d: Dungeon,
    opts?: { sources?: string[]; rng?: () => number }
  ): Dungeon {
    const encounters = { ...d.encounters };

    const R = opts?.rng ?? Math.random;

    let pool = RAW_MONSTERS;
    if (opts?.sources?.length) {
      const allowed = opts.sources.map((s) => s.toLowerCase());
      pool = pool.filter((m) =>
        m.Source1 && allowed.some((src) => m.Source1!.toLowerCase().includes(src))
      );
    }
    const MONSTERS: Monster[] = pool.map((m) => ({
      name: m.Description,
      sm: m.SM ?? null,
      cls: m.Class,
      subclass: m.Subclass,
      source: m.Source1
    }));

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
        const t = TRAPS[Math.floor(R() * TRAPS.length)];
        traps.push({ ...t });
      }

      if (R() < 0.5) {
        const t = TREASURE[Math.floor(R() * TREASURE.length)];
        treasure.push({ ...t });
      }

      encounters[r.id] = { monsters, traps, treasure };
    });

    return { ...d, encounters };
  }
};

export default dfrpg;

export { dfrpgLockService } from "./locks";
export { DFRPGTraps } from "./DFRPGTraps";
