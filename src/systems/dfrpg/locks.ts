import { customDataLoader } from '../../services/custom-data-loader';
import lockDefaults from '../../data/dfrpg-locks.json';
import { LockGeneratorService, DoorMaterialStats } from '../../services/lock-generator';

export interface LockData {
  name: string;
  description: string;
  skill_penalty: number;
  weight: number;
}

function weightedPick(r: () => number, locks: LockData[]): LockData {
  const total = locks.reduce((s, l) => s + (l.weight || 1), 0);
  let roll = r() * total;
  for (const l of locks) {
    roll -= l.weight || 1;
    if (roll < 0) return l;
  }
  return locks[0];
}

const LOCK_MODIFIERS: Record<string, number> = {
  simple: 5,
  average: 0,
  good: -3,
  fine: -5,
  magical: -10,
};

const PICK_TIMES: Record<string, number> = {
  simple: 10,
  average: 30,
  good: 60,
  fine: 120,
  magical: 300,
};

const SECRET_DOOR_PERCEPTION: Record<string, number> = {
  obvious: 0,
  hidden: -2,
  concealed: -4,
  camouflaged: -6,
};

const SECRET_DOOR_CHECKS: Record<string, string[]> = {
  basic: ['Traps', 'ST'],
  trapped: ['Traps', 'ST'],
  heavy: ['ST'],
  stuck: ['ST'],
};

const DOOR_MATERIALS: Record<string, DoorMaterialStats> = {
  wood: { dr: 3, hp: 15 },
  stone: { dr: 6, hp: 90 },
  iron: { dr: 8, hp: 120 },
  steel: { dr: 10, hp: 150 },
};

export const dfrpgLockService: LockGeneratorService & {
  getLock(name?: string, rng?: () => number): LockData;
} = {
  /**
   * Get a lock definition by name or randomly by weight
   */
  getLock(name?: string, rng: () => number = Math.random): LockData {
    const rawLocks = customDataLoader.getCustomData('dfrpg', 'locks');
    const locks = rawLocks.map(item => ({
      name: String(item.name || ''),
      description: String(item.description || ''),
      skill_penalty: Number(item.skill_penalty || 0),
      weight: Number(item.weight || 1)
    }));
    const allLocks = locks.length > 0 ? locks : (lockDefaults as LockData[]);
    if (name) {
      return allLocks.find(l => l.name.toLowerCase() === name.toLowerCase()) || allLocks[0];
    }
    return weightedPick(rng, allLocks);
  },
  
  getLockPickingModifier(quality: string): number {
    return LOCK_MODIFIERS[quality] ?? 0;
  },
  
  getLockPickingTime(quality: string): number {
    return PICK_TIMES[quality] ?? 60;
  },
  
  getSecretDoorPerception(difficulty: string): number {
    return SECRET_DOOR_PERCEPTION[difficulty] ?? 0;
  },
  
  getSecretDoorOpeningChecks(type: string): string[] {
    return SECRET_DOOR_CHECKS[type] ?? [];
  },
  
  doorMaterials: DOOR_MATERIALS,
};

export default dfrpgLockService;
