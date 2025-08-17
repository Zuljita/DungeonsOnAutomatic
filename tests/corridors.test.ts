import { describe, it, expect } from 'vitest';
import { generateRooms } from '../src/services/rooms.js';
import { connectRooms } from '../src/services/corridors.js';
import { rng } from '../src/services/random.js';
import { MapGenerator } from '../src/services/map-generator.js';

describe('corridors', () => {
  it('connectRooms returns a fully connected graph', () => {
    const r = rng('corridorTest');
    const rooms = generateRooms(15, 80, 60, r);
    const corridors = connectRooms(rooms, r);
    expect(corridors.length).toBe(rooms.length - 1);

    // Each corridor should traverse at least one tile between rooms
    for (const c of corridors) {
      expect(c.path.length).toBeGreaterThan(0);
    }

    const byId = new Map(rooms.map((r) => [r.id, r] as const));
    const inside = (p: { x: number; y: number }, r: (typeof rooms)[number]) =>
      p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
    for (const c of corridors) {
      const start = c.path[0];
      const end = c.path[c.path.length - 1];
      expect(inside(start, byId.get(c.from)!)).toBe(false);
      expect(inside(end, byId.get(c.to)!)).toBe(false);
    }

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

  it('connectRooms generates consistent ids with same RNG', () => {
    const r1 = rng('corridorIds');
    const r2 = rng('corridorIds');
    const rooms1 = generateRooms(10, 80, 60, r1);
    const rooms2 = generateRooms(10, 80, 60, r2);
    const corridors1 = connectRooms(rooms1, r1);
    const corridors2 = connectRooms(rooms2, r2);
    expect(corridors1.map((c) => c.id)).toEqual(corridors2.map((c) => c.id));
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
