import { describe, it, expect } from 'vitest';
import { loadSystemModule } from '../src/services/system-loader.js';
import { buildDungeon } from '../src/services/assembler.js';

describe('system-loader', () => {
  it('loads dfrpg module and enriches rooms', async () => {
    const dungeon = buildDungeon({ rooms: 2, seed: 'test' });
    const sys = await loadSystemModule('dfrpg', dungeon.rng);
    expect(sys.id).toBe('dfrpg');

    expect(dungeon.doors.length).toBe(dungeon.corridors.length * 2);
    const enriched = await sys.enrich(dungeon);

    dungeon.rooms.forEach((room) => {
      const enc = enriched.encounters?.[room.id];
      expect(enc).toBeTruthy();
      expect(enc?.monsters).toBeDefined();
      expect(enc?.traps).toBeDefined();
      expect(enc?.treasure).toBeDefined();
    });
  });

  it('throws on invalid system name', async () => {
    await expect(loadSystemModule('bogus')).rejects.toThrow('Unknown system');
  });
});
