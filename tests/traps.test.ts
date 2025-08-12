import { describe, expect, it } from 'vitest';
import TrapGeneratorService, { TrapSystem } from '../src/services/trap-generator';
import { DFRPGTraps } from '../src/systems/dfrpg/DFRPGTraps';
import { rng } from '../src/services/random.js';

describe('TrapGeneratorService', () => {
  it('generates traps with system stats and tracks placement', () => {
    const svc = new TrapGeneratorService(DFRPGTraps as TrapSystem);
    const r = rng('trapTest');
    const trap = svc.generateTrap('pit', 'easy', 'corridor', r);
    expect(trap.type).toBe('pit');
    expect(trap.location).toBe('corridor');
    expect(trap.systemStats.effect.falling).toBe('1d6 per 10 ft');

    const unplaced = svc.getUnplacedTraps();
    expect(unplaced).toHaveLength(1);

    svc.placeTrap(trap.id, { x: 1, y: 2 });
    expect(svc.getUnplacedTraps()).toHaveLength(0);
  });

  it('generates deterministic ids with same RNG', () => {
    const svc1 = new TrapGeneratorService(DFRPGTraps as TrapSystem);
    const svc2 = new TrapGeneratorService(DFRPGTraps as TrapSystem);
    const r1 = rng('trapIds');
    const r2 = rng('trapIds');
    const t1 = svc1.generateTrap('pit', 'easy', 'corridor', r1);
    const t2 = svc2.generateTrap('pit', 'easy', 'corridor', r2);
    expect(t1.id).toBe(t2.id);
  });
});
