import { describe, it, expect } from 'vitest';
import { loadSystemModule } from '../src/services/system-loader.js';
import { buildDungeon } from '../src/services/assembler.js';
import { customDataLoader } from '../src/services/custom-data-loader.js';

describe('dfrpg source filtering', () => {
  it('only includes monsters from selected sources', async () => {
    const dungeon = buildDungeon({ rooms: 3, seed: 'sourcestest' }); // Use different seed
    const sys = await loadSystemModule('dfrpg', dungeon.rng);
    expect(dungeon.doors.length).toBe(dungeon.corridors.length * 2);
    
    
    // Use the same dungeon instance to ensure same RNG state
    const enrichedFiltered = await sys.enrich(dungeon, { sources: ['DF3'] });
    
    const entriesFiltered = Object.values(enrichedFiltered.encounters || {});
    const monstersFiltered = entriesFiltered.flatMap((e) => e.monsters || []);
    
    expect(monstersFiltered.length).toBeGreaterThan(0);
    
    // If source filtering works, monsters should only come from sources containing 'DF3'
    monstersFiltered.forEach((m, i) => {
      if (m.name !== 'Generic Threat') {
        expect(m.source?.toLowerCase().includes('df3'), `Monster ${i}: ${m.name} has source ${m.source} which doesn't contain DF3`).toBe(true);
      }
    });
  });
});
