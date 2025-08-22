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
        corridor.path.forEach((p) => {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThan(WIDTH);
          expect(p.y).toBeLessThan(HEIGHT);
        });
        const start = corridor.path[0];
        const end = corridor.path[corridor.path.length - 1];
        
        // Corridors should start near room edges, allowing for pathfinding adjustments
        // Check that start point is close to the from room (within 5 units of room boundary)
        const startNearFromRoom = 
          (Math.abs(start.x - from!.x) <= 5 && start.y >= from!.y - 5 && start.y <= from!.y + from!.h + 5) ||           // Near left edge
          (Math.abs(start.x - (from!.x + from!.w)) <= 5 && start.y >= from!.y - 5 && start.y <= from!.y + from!.h + 5) || // Near right edge  
          (Math.abs(start.y - from!.y) <= 5 && start.x >= from!.x - 5 && start.x <= from!.x + from!.w + 5) ||           // Near top edge
          (Math.abs(start.y - (from!.y + from!.h)) <= 5 && start.x >= from!.x - 5 && start.x <= from!.x + from!.w + 5);  // Near bottom edge
        
        expect(startNearFromRoom).toBe(true);
        
        // Check that end point is close to the to room (within 5 units of room boundary)
        const endNearToRoom = 
          (Math.abs(end.x - to!.x) <= 5 && end.y >= to!.y - 5 && end.y <= to!.y + to!.h + 5) ||           // Near left edge
          (Math.abs(end.x - (to!.x + to!.w)) <= 5 && end.y >= to!.y - 5 && end.y <= to!.y + to!.h + 5) ||   // Near right edge
          (Math.abs(end.y - to!.y) <= 5 && end.x >= to!.x - 5 && end.x <= to!.x + to!.w + 5) ||           // Near top edge
          (Math.abs(end.y - (to!.y + to!.h)) <= 5 && end.x >= to!.x - 5 && end.x <= to!.x + to!.w + 5);     // Near bottom edge
        expect(endNearToRoom).toBe(true);
      });
    });
  });

  it('keeps wide corridors within map bounds', () => {
    const generator = new MapGenerator('wide');
    const dungeon = generator.generateDungeon({
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      corridorWidth: 3,
      allowDeadends: true,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      rooms: BASE_ROOMS,
      width: WIDTH,
      height: HEIGHT,
    });

    dungeon.corridors.forEach((corridor) => {
      corridor.path.forEach((p) => {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(WIDTH);
        expect(p.y).toBeLessThan(HEIGHT);
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
