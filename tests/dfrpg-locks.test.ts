import { describe, expect, it } from 'vitest';
import { dfrpgLockService } from '../src/systems/dfrpg/locks';

describe('dfrpgLockService', () => {
  it('provides lockpicking modifiers', () => {
    expect(dfrpgLockService.getLockPickingModifier('good')).toBe(-3);
  });

  it('provides lockpicking times', () => {
    expect(dfrpgLockService.getLockPickingTime('simple')).toBe(10);
  });

  it('provides secret door perception modifiers', () => {
    expect(dfrpgLockService.getSecretDoorPerception('camouflaged')).toBe(-6);
  });

  it('lists checks required to open secret doors', () => {
    expect(dfrpgLockService.getSecretDoorOpeningChecks('trapped')).toContain('Traps');
  });

  it('exposes door material statistics', () => {
    expect(dfrpgLockService.doorMaterials['wood']).toEqual({ dr: 3, hp: 15 });
  });
});
