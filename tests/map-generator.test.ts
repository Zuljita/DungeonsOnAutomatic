import { describe, it, expect } from 'vitest';
import { MapGenerator } from '../src/services/map-generator.js';

describe('map generator', () => {
  const WIDTH = 100;
  const HEIGHT = 100;
  const BASE_ROOMS = 6;

  const combos = [
    { layoutType: 'rectangle', roomLayout: 'scattered', expectedRooms: BASE_ROOMS },
    { layoutType: 'square', roomLayout: 'sparse', expectedRooms: Math.floor(BASE_ROOMS * 0.6) },
    { layoutType: 'cross', roomLayout: 'dense', expectedRooms: Math.floor(BASE_ROOMS * 1.5) },
    { layoutType: 'box', roomLayout: 'symmetric', expectedRooms: Math.floor(BASE_ROOMS / 2) * 2 },
  ] as const;

  combos.forEach(({ layoutType, roomLayout, expectedRooms }, index) => {
    it(`generates ${layoutType} layout with ${roomLayout} rooms`, () => {
      const generator = new MapGenerator(`seed-${index}`);
      const dungeon = generator.generateDungeon({
        layoutType,
        roomLayout,
        roomSize: 'medium',
        roomShape: 'rectangular',
        corridorType: 'straight',
        allowDeadends: true,
        stairsUp: false,
        stairsDown: false,
        entranceFromPeriphery: false,
        rooms: BASE_ROOMS,
        width: WIDTH,
        height: HEIGHT,
      });

      const nonSpecialRooms = dungeon.rooms.filter((r) => r.kind !== 'special');
      expect(nonSpecialRooms.length).toBe(expectedRooms);

      // Rooms stay within bounds
      nonSpecialRooms.forEach((room) => {
        expect(room.x).toBeGreaterThanOrEqual(0);
        expect(room.y).toBeGreaterThanOrEqual(0);
        expect(room.x + room.w).toBeLessThanOrEqual(WIDTH);
        expect(room.y + room.h).toBeLessThanOrEqual(HEIGHT);
      });

      // Corridors connect rooms
      expect(dungeon.corridors.length).toBe(expectedRooms - 1);
      dungeon.corridors.forEach((corridor) => {
        expect(corridor.path.length).toBeGreaterThan(0);
        const from = nonSpecialRooms.find((r) => r.id === corridor.from);
        const to = nonSpecialRooms.find((r) => r.id === corridor.to);
        expect(from).toBeDefined();
        expect(to).toBeDefined();
        const start = corridor.path[0];
        const end = corridor.path[corridor.path.length - 1];
        
        // Corridors should start at room edges (door connections), not centers
        // Check that start point is on the edge of the from room
        const isStartOnFromRoomEdge = 
          (start.x === from!.x && start.y >= from!.y && start.y < from!.y + from!.h) ||           // Left edge
          (start.x === from!.x + from!.w && start.y >= from!.y && start.y < from!.y + from!.h) || // Right edge  
          (start.y === from!.y && start.x >= from!.x && start.x < from!.x + from!.w) ||           // Top edge
          (start.y === from!.y + from!.h && start.x >= from!.x && start.x < from!.x + from!.w);  // Bottom edge
        expect(isStartOnFromRoomEdge).toBe(true);
        
        // Check that end point is on the edge of the to room
        const isEndOnToRoomEdge = 
          (end.x === to!.x && end.y >= to!.y && end.y < to!.y + to!.h) ||           // Left edge
          (end.x === to!.x + to!.w && end.y >= to!.y && end.y < to!.y + to!.h) ||   // Right edge
          (end.y === to!.y && end.x >= to!.x && end.x < to!.x + to!.w) ||           // Top edge
          (end.y === to!.y + to!.h && end.x >= to!.x && end.x < to!.x + to!.w);     // Bottom edge
        expect(isEndOnToRoomEdge).toBe(true);
      });
    });
  });

  it('creates no dead-end corridors when disallowed', () => {
    const generator = new MapGenerator('deadend');
    const dungeon = generator.generateDungeon({
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      allowDeadends: false,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      rooms: 4,
      width: WIDTH,
      height: HEIGHT,
    });

    const nonSpecialRooms = dungeon.rooms.filter((r) => r.kind !== 'special');
    expect(dungeon.corridors.length).toBeGreaterThanOrEqual(nonSpecialRooms.length - 1);
  });

  it('generates identical dungeons when using the same seed', () => {
    const generator = new MapGenerator();
    const options = {
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      allowDeadends: false,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      rooms: BASE_ROOMS,
      width: WIDTH,
      height: HEIGHT,
      seed: 'repeat-me'
    } as const;

    const first = generator.generateDungeon(options);
    const second = generator.generateDungeon(options);

    const { rng: _r1, ...rest1 } = first;
    const { rng: _r2, ...rest2 } = second;
    expect(rest2).toEqual(rest1);
  });
});
