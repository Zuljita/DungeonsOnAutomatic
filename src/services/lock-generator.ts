export interface DoorMaterialStats {
  dr: number;
  hp: number;
}

export interface LockGeneratorService {
  /**
   * DX modifier for a lockpicking attempt. Positive numbers are easier,
   * negative numbers are harder.
   */
  getLockPickingModifier(quality: string): number;

  /**
   * Time in seconds required to pick a lock of the given quality.
   */
  getLockPickingTime(quality: string): number;

  /**
   * Modifier to the Perception roll required to notice a secret door.
   */
  getSecretDoorPerception(difficulty: string): number;

  /**
   * Skill or attribute checks required to open the secret door once found.
   */
  getSecretDoorOpeningChecks(type: string): string[];

  /**
   * Lookup table of door materials with Damage Resistance (DR) and Hit Points
   * (HP) used when forcing open or destroying doors.
   */
  doorMaterials: Record<string, DoorMaterialStats>;
}
