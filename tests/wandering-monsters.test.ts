import { describe, it, expect } from 'vitest';
import { buildDungeon } from '../src/services/assembler.js';
import { dfrpg } from '../src/systems/dfrpg/index.js';

describe('wandering monsters', () => {
  it('generates a wandering monster table when encounters have monsters', () => {
    const dungeon = buildDungeon({ rooms: 3, seed: 'wandering' });
    const enriched = dfrpg.enrich(dungeon, { rng: () => 0 });

    const totalMonsters = Object.values(enriched.encounters)
      .flatMap(e => e.monsters)
      .length;
    expect(totalMonsters).toBeGreaterThan(0);
    expect(enriched.wanderingMonsters?.length).toBeGreaterThan(0);
  });
});
