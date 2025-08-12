import { describe, expect, it } from 'vitest';
import TrapGeneratorService, { TrapSystem } from '../src/services/trap-generator';
import { DFRPGTraps } from '../src/systems/dfrpg/DFRPGTraps';
import { rng } from '../src/services/random.js';

describe('TrapGeneratorService', () => {
  it('generates traps with system stats and tracks placement', () => {
    const svc = new TrapGeneratorService(DFRPGTraps as TrapSystem, rng('trapTest'));
    const trap = svc.generateTrap('pit', 'easy', 'corridor');
    expect(trap.type).toBe('pit');
    expect(trap.location).toBe('corridor');
    expect(trap.systemStats.effect.falling).toBe('1d6 per 10 ft');

    const unplaced = svc.getUnplacedTraps();
    expect(unplaced).toHaveLength(1);

    svc.placeTrap(trap.id, { x: 1, y: 2 });
    expect(svc.getUnplacedTraps()).toHaveLength(0);
  });
  it('generates deterministic ids', () => {
    const svc1 = new TrapGeneratorService(DFRPGTraps as TrapSystem, rng('trapId'));
    const t1 = svc1.generateTrap('pit', 'easy', 'corridor');
    const svc2 = new TrapGeneratorService(DFRPGTraps as TrapSystem, rng('trapId'));
    const t2 = svc2.generateTrap('pit', 'easy', 'corridor');
    expect(t1.id).toBe(t2.id);
  });
});
