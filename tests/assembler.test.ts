import { describe, it, expect } from 'vitest';
import { buildDungeon } from '../src/services/assembler.js';

describe('assembler', () => {
  it('builds a dungeon within custom dimensions', () => {
    const width = 40;
    const height = 30;
    const d = buildDungeon({ rooms: 10, width, height, seed: 'test' });
    expect(d.rooms.length).toBeGreaterThan(0);
    const maxX = Math.max(...d.rooms.map(r => r.x + r.w));
    const maxY = Math.max(...d.rooms.map(r => r.y + r.h));
    expect(maxX).toBeLessThanOrEqual(width);
    expect(maxY).toBeLessThanOrEqual(height);
    expect(d.doors.length).toBe(d.corridors.length * 2);
  });
});
