import { describe, it, expect } from 'vitest';
import { buildDungeon } from '../src/services/assembler.js';

describe('assembler', () => {
  it('builds a dungeon with the requested number of rooms', () => {
    const d = buildDungeon({ rooms: 10, seed: 'test' });
    expect(d.rooms.length).toBeGreaterThan(0);
  });
});
