import { describe, it, expect } from 'vitest';
import { generateRooms } from '../src/services/rooms.js';
import { connectRooms } from '../src/services/corridors.js';
import { rng } from '../src/services/random.js';

describe('corridors', () => {
  it('connectRooms returns a fully connected graph', () => {
    const r = rng('corridorTest');
    const rooms = generateRooms(15, 80, 60, r);
    const corridors = connectRooms(rooms);
    expect(corridors.length).toBe(rooms.length - 1);

    // Each corridor should traverse at least one tile between rooms
    for (const c of corridors) {
      expect(c.path.length).toBeGreaterThan(1);
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
});
