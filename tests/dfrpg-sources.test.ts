import { describe, it, expect } from 'vitest';
import { loadSystemModule } from '../src/services/system-loader.js';
import { buildDungeon } from '../src/services/assembler.js';

describe('dfrpg source filtering', () => {
  it('only includes monsters from selected sources', async () => {
    const sys = await loadSystemModule('dfrpg');
    const dungeon = buildDungeon({ rooms: 20, seed: 'test' });
    expect(dungeon.doors.length).toBe(dungeon.corridors.length * 2);
    const enriched = await sys.enrich(dungeon, { sources: ['DF16'] });

    const entries = Object.values(enriched.encounters || {});
    const monsters = entries.flatMap((e) => e.monsters || []);
    expect(monsters.length).toBeGreaterThan(0);
    monsters.forEach((m) => {
      expect(m.source).toBeDefined();
      expect(m.source?.toLowerCase()).toContain('df16');
    });
  });
});
