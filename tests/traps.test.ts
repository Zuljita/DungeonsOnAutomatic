import { describe, expect, it } from 'vitest';
import TrapGeneratorService, { TrapSystem } from '../src/services/trap-generator';
import { dfrpgTrapService } from '../src/systems/dfrpg/traps';

describe('TrapGeneratorService', () => {
  it('generates traps with system stats and tracks placement', () => {
    const svc = new TrapGeneratorService(dfrpgTrapService as TrapSystem);
    const trap = svc.generateTrap('projectile', 'easy', 'corridor');
    expect(trap.type).toBe('projectile');
    expect(trap.location).toBe('corridor');
    expect(trap.systemStats.damage).toBe('1d6 imp');

    const unplaced = svc.getUnplacedTraps();
    expect(unplaced).toHaveLength(1);

    svc.placeTrap(trap.id, { x: 1, y: 2 });
    expect(svc.getUnplacedTraps()).toHaveLength(0);
  });
});
