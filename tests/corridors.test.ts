import { describe, it, expect } from 'vitest';
import { connectRooms } from '../src/services/corridors.js';
import { rng } from '../src/services/random.js';
import { MapGenerator } from '../src/services/map-generator.js';

describe('corridors', () => {
  it('MapGenerator creates connected dungeons', () => {
    const generator = new MapGenerator('corridorTest');
    const dungeon = generator.generateDungeon({
      rooms: 15,
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
      seed: 'corridorTest'
    });
    const rooms = dungeon.rooms;
    const corridors = dungeon.corridors;

    // Should have corridors connecting rooms
    expect(corridors.length).toBeGreaterThanOrEqual(rooms.length - 1);

    // Each corridor should have a path
    for (const c of corridors) {
      expect(c.path.length).toBeGreaterThan(0);
    }

    // Test connectivity - all rooms should be reachable
    const adj = new Map<string, string[]>();
    for (const c of corridors) {
      if (!adj.has(c.from)) adj.set(c.from, []);
      if (!adj.has(c.to)) adj.set(c.to, []);
      adj.get(c.from)!.push(c.to);
      adj.get(c.to)!.push(c.from);
    }

    const visited = new Set<string>();
    const queue: string[] = [rooms[0].id];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      for (const next of adj.get(id) ?? []) {
        if (!visited.has(next)) queue.push(next);
      }
    }
    expect(visited.size).toBe(rooms.length);
  });

  it('MapGenerator generates consistent ids with same seed', () => {
    const generator1 = new MapGenerator('corridorIds');
    const generator2 = new MapGenerator('corridorIds');
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
      seed: 'corridorIds'
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
      seed: 'corridorIds'
    });
    expect(dungeon1.corridors.map((c) => c.id)).toEqual(dungeon2.corridors.map((c) => c.id));
  });

  it('randomizes corridor orientation using the RNG', () => {
    const rooms = [
      { id: 'a', kind: 'chamber', x: 0, y: 0, w: 1, h: 1 },
      { id: 'b', kind: 'chamber', x: 3, y: 4, w: 1, h: 1 },
    ];

    const horizFirst = connectRooms(rooms, () => 0)[0].path;
    const vertFirst = connectRooms(rooms, () => 0.9)[0].path;

    expect(horizFirst[1].y).toBe(horizFirst[0].y); // moved horizontally first
    expect(vertFirst[1].x).toBe(vertFirst[0].x);   // moved vertically first
  });

  it('adds extra corridors to create loops when deadends are disallowed', () => {
    const gen = new MapGenerator('loop-test');
    const dungeon = gen.generateDungeon({
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      allowDeadends: false,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      rooms: 12,
      width: 80,
      height: 60,
      seed: 'loop-test',
    });

    expect(dungeon.corridors.length).toBeGreaterThan(dungeon.rooms.length - 1);
  });
});
