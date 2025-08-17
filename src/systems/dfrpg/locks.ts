import { customDataLoader } from '../../services/custom-data-loader';
import lockDefaults from '../../data/dfrpg-locks.json';

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

export const dfrpgLockService = {
  /**
   * Get a lock definition by name or randomly by weight
   */
  getLock(name?: string, rng: () => number = Math.random): LockData {
    const locks = customDataLoader.getCustomData('dfrpg', 'locks') as LockData[];
    const allLocks = locks.length > 0 ? locks : (lockDefaults as LockData[]);
    if (name) {
      return allLocks.find(l => l.name.toLowerCase() === name.toLowerCase()) || allLocks[0];
    }
    return weightedPick(rng, allLocks);
  }
};

export default dfrpgLockService;
