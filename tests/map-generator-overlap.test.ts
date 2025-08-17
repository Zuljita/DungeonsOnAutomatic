import { describe, it, expect } from 'vitest';
import { MapGenerator } from '../src/services/map-generator';

function overlaps(a: {x:number;y:number;w:number;h:number}, b: {x:number;y:number;w:number;h:number}): boolean {
  // Same logic as rooms.test.ts - treat touching rooms as overlapping by adding padding
  return !(
    a.x + a.w + 1 <= b.x ||
    b.x + b.w + 1 <= a.x ||
    a.y + a.h + 1 <= b.y ||
    b.y + b.h + 1 <= a.y
  );
}

describe('MapGenerator overlap prevention', () => {
  it('produces non-overlapping rooms with scattered layout', () => {
    const generator = new MapGenerator('test-seed');
    const dungeon = generator.generateDungeon({
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
      seed: 'test-seed'
    });

    expect(dungeon.rooms.length).toBeGreaterThan(0);
    
    // Check that no rooms overlap
    for (let i = 0; i < dungeon.rooms.length; i++) {
      for (let j = i + 1; j < dungeon.rooms.length; j++) {
        expect(overlaps(dungeon.rooms[i], dungeon.rooms[j])).toBe(false);
      }
    }
  });

  it('produces non-overlapping rooms with dense layout', () => {
    const generator = new MapGenerator('test-seed-2');
    const dungeon = generator.generateDungeon({
      rooms: 12,
      width: 60,
      height: 50,
      layoutType: 'box',
      roomLayout: 'dense',
      roomSize: 'small',
      roomShape: 'rectangular',
      corridorType: 'straight',
      allowDeadends: true,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      seed: 'test-seed-2'
    });

    expect(dungeon.rooms.length).toBeGreaterThan(0);
    
    // Check that no rooms overlap
    for (let i = 0; i < dungeon.rooms.length; i++) {
      for (let j = i + 1; j < dungeon.rooms.length; j++) {
        expect(overlaps(dungeon.rooms[i], dungeon.rooms[j])).toBe(false);
      }
    }
  });
});