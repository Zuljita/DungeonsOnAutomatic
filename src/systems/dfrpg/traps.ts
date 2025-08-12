import { TrapSystem } from '../../services/trap-generator';

const TRAPS: Record<string, Record<string, { name: string; [key: string]: unknown }>> = {
  projectile: {
    easy: { name: 'Simple Dart Trap', damage: '1d6 imp', trigger: 'pressure plate' },
    hard: { name: 'Poisoned Dart Trap', damage: '1d6 imp', trigger: 'pressure plate', poison: 'HT-3' },
  },
  pit: {
    easy: { name: 'Shallow Pit', damage: '2d crushing', depth: 10 },
    hard: { name: 'Spiked Pit', damage: '3d impaling', depth: 20 },
  },
  magical: {
    easy: { name: 'Alarm Rune', effect: 'alerts nearby foes' },
    hard: { name: 'Fire Rune', damage: '2d burning', resistance: 'Dodge-2' },
  },
};

export const dfrpgTrapService: TrapSystem = {
  getTrapStats(type: string, difficulty: string) {
    return TRAPS[type]?.[difficulty] ?? { name: `${difficulty} ${type} trap` };
  },
};

export default dfrpgTrapService;
