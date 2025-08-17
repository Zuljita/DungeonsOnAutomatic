import { describe, it, expect, vi } from 'vitest';
import { DFRPGMonsterGenerator } from '../src/systems/dfrpg/DFRPGMonsterGenerator';

// Mock monster data with explicit frequencies
vi.mock('../src/systems/dfrpg/data/monsters.js', () => ({
  MONSTERS: [
    { name: 'Goblin', points: 1, tags: [], biome: [], frequency: 'very_common' },
    { name: 'Dragon', points: 1, tags: [], biome: [], frequency: 'very_rare' }
  ]
}));

function lcg(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 0x100000000;
    return seed / 0x100000000;
  };
}

describe('DFRPGMonsterGenerator frequency weighting', () => {
  it('prefers common monsters over rare ones', () => {
    const rng = lcg(1);
    const g = new DFRPGMonsterGenerator(rng);
    const counts: Record<string, number> = { Goblin: 0, Dragon: 0 };
    for (let i = 0; i < 1000; i++) {
      const encounter = g.generate({ characterPoints: 2 });
      for (const m of encounter) {
        counts[m.name]++;
      }
    }
    expect(counts.Goblin).toBeGreaterThan(counts.Dragon);
    expect(counts.Goblin).toBeGreaterThan(counts.Dragon * 3);
  });
});
