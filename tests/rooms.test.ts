import { describe, it, expect } from 'vitest';
import { MapGenerator } from '../src/services/map-generator.js';

function overlaps(a: {x:number;y:number;w:number;h:number}, b: {x:number;y:number;w:number;h:number}): boolean {
  // Check for actual room interior overlap (not just touching)
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
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
        const room1 = dungeon.rooms[i];
        const room2 = dungeon.rooms[j];
        const isOverlapping = overlaps(room1, room2);
        if (isOverlapping) {
          console.log(`OVERLAP: Room ${i} (${room1.x},${room1.y},${room1.w}x${room1.h}) kind:${room1.kind} overlaps with Room ${j} (${room2.x},${room2.y},${room2.w}x${room2.h}) kind:${room2.kind}`);
        }
        expect(isOverlapping).toBe(false);
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
