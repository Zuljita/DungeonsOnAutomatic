import { Trap } from '../../core/types';
import { customDataLoader } from '../../services/custom-data-loader';
import trapDefaults from '../../data/dfrpg-traps.json';
import { TrapSystem } from '../../services/trap-generator';

interface TrapStatBlock extends Record<string, unknown> {
  name: string;
  detect: { skill: string; modifier?: number };
  disarm: { skill: string; modifier?: number };
  effect: Record<string, unknown>;
}

const TRAP_DATA: Record<string, Record<string, TrapStatBlock>> = {
  pit: {
    easy: {
      name: 'Shallow Pit',
      detect: { skill: 'Traps (Per)', modifier: -2 },
      disarm: { skill: 'Traps (DX or IQ)' },
      effect: { falling: '1d6 per 10 ft' }
    },
    medium: {
      name: 'Deep Pit',
      detect: { skill: 'Traps (Per)', modifier: -3 },
      disarm: { skill: 'Traps (DX or IQ)' },
      effect: { falling: '2d6 per 10 ft' }
    },
    hard: {
      name: 'Spiked Pit',
      detect: { skill: 'Traps (Per)', modifier: -4 },
      disarm: { skill: 'Traps (DX or IQ)' },
      effect: { falling: '2d6 per 20 ft', spikes: '1d+2 imp' }
    }
  }
};

function weightedPick(r: () => number, traps: Trap[]): Trap {
  const total = traps.reduce((sum, t) => sum + (t.weight ?? 1), 0);
  let roll = r() * total;
  for (const t of traps) {
    roll -= t.weight ?? 1;
    if (roll < 0) return t;
  }
  return traps[0];
}

export const DFRPGTraps: TrapSystem & {
  getTrap(name?: string, rng?: () => number): Trap;
} = {
  /**
   * Get a trap by name or pick one at random using weights
   */
  getTrap(name?: string, rng: () => number = Math.random): Trap {
    const traps = customDataLoader.getTraps('dfrpg', trapDefaults as Trap[]);
    if (name) {
      return traps.find(t => t.name.toLowerCase() === name.toLowerCase()) || traps[0];
    }
    return weightedPick(rng, traps);
  },

  getTrapStats(type: string, difficulty: string = 'easy') {
    const trap = TRAP_DATA[type];
    if (!trap) {
      return { name: `${difficulty} ${type} trap` };
    }
    const stats = trap[difficulty];
    if (!stats) {
      throw new Error(`Unknown difficulty '${difficulty}' for trap type '${type}'`);
    }
    return stats;
  }
};

export default DFRPGTraps;
