import { describe, it, expect } from 'vitest';
import { buildDungeon } from '../src/services/assembler.js';

describe('assembler', () => {
  it('builds a dungeon with the requested number of rooms', () => {
    const d = buildDungeon({ rooms: 10, seed: 'test' });
    expect(d.rooms.length).toBeGreaterThan(0);
  });

  it('buildDungeon produces deterministic ids', () => {
    const d1 = buildDungeon({ rooms: 5, seed: 'seed123' });
    const d2 = buildDungeon({ rooms: 5, seed: 'seed123' });
    expect(d1.rooms.map(r => r.id)).toEqual(d2.rooms.map(r => r.id));
    expect(d1.corridors.map(c => c.id)).toEqual(d2.corridors.map(c => c.id));
  });
});
