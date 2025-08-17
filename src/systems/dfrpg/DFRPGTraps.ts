import { Trap } from '../../core/types';
import { customDataLoader } from '../../services/custom-data-loader';
import trapDefaults from '../../data/dfrpg-traps.json';

function weightedPick(r: () => number, traps: Trap[]): Trap {
  const total = traps.reduce((sum, t) => sum + (t.weight ?? 1), 0);
  let roll = r() * total;
  for (const t of traps) {
    roll -= t.weight ?? 1;
    if (roll < 0) return t;
  }
  return traps[0];
}

export const DFRPGTraps = {
  /**
   * Get a trap by name or pick one at random using weights
   */
  getTrap(name?: string, rng: () => number = Math.random): Trap {
    const traps = customDataLoader.getTraps('dfrpg', trapDefaults as Trap[]);
    if (name) {
      return traps.find(t => t.name.toLowerCase() === name.toLowerCase()) || traps[0];
    }
    return weightedPick(rng, traps);
  }
};

export default DFRPGTraps;
