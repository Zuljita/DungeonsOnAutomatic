import { describe, it, expect, vi } from 'vitest';
import { DFRPGMonsterGenerator } from '../src/systems/dfrpg/DFRPGMonsterGenerator';

// Mock monster data with explicit frequencies
vi.mock('../src/systems/dfrpg/data/monsters.js', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    MONSTERS: [
      { name: 'Goblin', cer: 1, sm: 0, tags: [], biome: ['dungeon'], frequency: 'very_common', class: 'Humanoid', subclass: '', source: 'Test' },
      { name: 'Dragon', cer: 1, sm: 0, tags: [], biome: ['dungeon'], frequency: 'very_rare', class: 'Dragon', subclass: '', source: 'Test' }
    ]
  };
});

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
      for (const m of encounter.monsters) {
        counts[m.name]++;
      }
    }
    expect(counts.Goblin).toBeGreaterThan(counts.Dragon);
    expect(counts.Goblin).toBeGreaterThan(counts.Dragon * 3);
  });
});
