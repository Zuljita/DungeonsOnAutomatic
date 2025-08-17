import { describe, expect, it } from 'vitest';
import { DFRPGTraps } from '../src/systems/dfrpg/DFRPGTraps';

describe('DFRPGTraps data', () => {
  it('provides stats for medium difficulty traps', () => {
    const stats = DFRPGTraps.getTrapStats('pit', 'medium');
    expect(stats.name).toBe('Deep Pit');
  });

  it('defaults to easy when difficulty is omitted', () => {
    const stats = (DFRPGTraps as any).getTrapStats('pit');
    expect(stats.name).toBe('Shallow Pit');
  });

  it('throws for unknown difficulties', () => {
    expect(() => DFRPGTraps.getTrapStats('pit', 'extreme')).toThrow();
  });
});
