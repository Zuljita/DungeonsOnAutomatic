import { describe, it, expect } from 'vitest';
import { generateRooms } from '../src/services/rooms.js';
import { rng } from '../src/services/random.js';

function overlaps(a: {x:number;y:number;w:number;h:number}, b: {x:number;y:number;w:number;h:number}): boolean {
  // Treat touching rooms as overlapping by adding a one-tile padding
  return !(
    a.x + a.w + 1 <= b.x ||
    b.x + b.w + 1 <= a.x ||
    a.y + a.h + 1 <= b.y ||
    b.y + b.h + 1 <= a.y
  );
}

describe('rooms', () => {
  it('generateRooms produces non-overlapping rooms', () => {
    const r = rng('roomTest');
    const rooms = generateRooms(20, 80, 60, r);
    expect(rooms.length).toBe(20);
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        expect(overlaps(rooms[i], rooms[j])).toBe(false);
      }
    }
  });

  it('generateRooms produces consistent ids with same RNG', () => {
    const r1 = rng('roomTest');
    const r2 = rng('roomTest');
    const rooms1 = generateRooms(10, 80, 60, r1);
    const rooms2 = generateRooms(10, 80, 60, r2);
    expect(rooms1.map((r) => r.id)).toEqual(rooms2.map((r) => r.id));
  });
});
