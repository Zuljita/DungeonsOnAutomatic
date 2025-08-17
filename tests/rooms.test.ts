import { describe, it, expect } from 'vitest';
import { MapGenerator } from '../src/services/map-generator.js';

function overlaps(a: {x:number;y:number;w:number;h:number}, b: {x:number;y:number;w:number;h:number}): boolean {
  // Treat touching rooms as overlapping by adding a one-tile padding
  return !(
    a.x + a.w + 1 <= b.x ||
    b.x + b.w + 1 <= a.x ||
    a.y + a.h + 1 <= b.y ||
    b.y + b.h + 1 <= a.y
  );
}

describe('room generation', () => {
  it('MapGenerator produces non-overlapping rooms', () => {
    const generator = new MapGenerator('roomTest');
    const dungeon = generator.generateDungeon({
      rooms: 20,
      width: 80,
      height: 60,
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      allowDeadends: true,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      seed: 'roomTest'
    });
    expect(dungeon.rooms.length).toBe(20);
    for (let i = 0; i < dungeon.rooms.length; i++) {
      for (let j = i + 1; j < dungeon.rooms.length; j++) {
        expect(overlaps(dungeon.rooms[i], dungeon.rooms[j])).toBe(false);
      }
    }
  });

  it('MapGenerator produces consistent ids with same seed', () => {
    const generator1 = new MapGenerator('roomTest');
    const generator2 = new MapGenerator('roomTest');
    const dungeon1 = generator1.generateDungeon({
      rooms: 10,
      width: 80,
      height: 60,
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      allowDeadends: true,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      seed: 'roomTest'
    });
    const dungeon2 = generator2.generateDungeon({
      rooms: 10,
      width: 80,
      height: 60,
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      allowDeadends: true,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      seed: 'roomTest'
    });
    expect(dungeon1.rooms.map((r) => r.id)).toEqual(dungeon2.rooms.map((r) => r.id));
  });
});
