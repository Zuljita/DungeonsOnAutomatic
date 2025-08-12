import { DoorMaterialStats, LockGeneratorService } from '../../services/lock-generator';

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

export const dfrpgLockService: LockGeneratorService = {
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
