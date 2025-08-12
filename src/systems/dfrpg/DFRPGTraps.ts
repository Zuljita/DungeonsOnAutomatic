import { TrapSystem } from '../../services/trap-generator';

interface TrapStatBlock {
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
    hard: {
      name: 'Spiked Pit',
      detect: { skill: 'Traps (Per)', modifier: -4 },
      disarm: { skill: 'Traps (DX or IQ)' },
      effect: { falling: '2d6 per 20 ft', spikes: '1d+2 imp' }
    }
  },
  poison_dart: {
    easy: {
      name: 'Poison Dart Trap',
      detect: { skill: 'Vision or Perception', modifier: -4 },
      disarm: { skill: 'Traps (DX or IQ)' },
      effect: { poison: 'HT-2, 1d toxic' }
    },
    hard: {
      name: 'Nasty Poison Dart Trap',
      detect: { skill: 'Vision or Perception', modifier: -5 },
      disarm: { skill: 'Traps (DX or IQ)' },
      effect: { poison: 'HT-3, 1d toxic/second' }
    }
  },
  swinging_blade: {
    easy: {
      name: 'Swinging Blade',
      detect: { skill: 'Traps (Per)', modifier: -2 },
      disarm: { skill: 'Traps (DX or IQ)' },
      effect: { damage: '2d cutting', dodge: true }
    },
    hard: {
      name: 'Heavy Swinging Blade',
      detect: { skill: 'Traps (Per)', modifier: -3 },
      disarm: { skill: 'Traps (DX or IQ)' },
      effect: { damage: '2d+2 cutting', dodge: true }
    }
  },
  magical_glyph: {
    easy: {
      name: 'Fireball Glyph',
      detect: { skill: 'Detect Magic or Traps (Per)' },
      disarm: { skill: 'Thaumatology or Traps' },
      effect: { spell: 'Fireball', damage: '3d+3 burning' }
    },
    hard: {
      name: 'Paralyzing Glyph',
      detect: { skill: 'Detect Magic or Traps (Per)', modifier: -2 },
      disarm: { skill: 'Thaumatology or Traps', modifier: -2 },
      effect: { spell: 'Paralyze', resist: 'Will-2' }
    }
  }
};

export const DFRPGTraps: TrapSystem = {
  getTrapStats(type: string, difficulty: string) {
    return TRAP_DATA[type]?.[difficulty] ?? { name: `${difficulty} ${type} trap` };
  }
};

export default DFRPGTraps;
