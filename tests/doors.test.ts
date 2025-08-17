import { describe, it, expect } from 'vitest';
import { generateDoor, DOOR_TYPES, DOOR_STATUSES } from '../src/services/doors.js';
import { rng } from '../src/services/random.js';
import { buildDungeon } from '../src/services/assembler.js';
import { MapGenerator } from '../src/services/map-generator.js';

describe('doors', () => {
  it('generateDoor produces valid types and statuses', () => {
    const r = rng('doorTest');
    const types = new Set<string>();
    const statuses = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const d = generateDoor(r, { fromRoom: 'A', toRoom: 'B', location: { x: i, y: i } });
      types.add(d.type);
      statuses.add(d.status);
      expect(d.fromRoom).toBe('A');
      expect(d.toRoom).toBe('B');
      expect(d.location).toEqual({ x: i, y: i });
    }
    expect([...types].sort()).toEqual([...DOOR_TYPES].sort());
    expect([...statuses].sort()).toEqual([...DOOR_STATUSES].sort());
  });

  it('generateDoor produces consistent ids with same RNG', () => {
    const r1 = rng('doorIds');
    const r2 = rng('doorIds');
    const ids1 = Array.from({ length: 10 }, () => generateDoor(r1, { fromRoom: 'X' }).id);
    const ids2 = Array.from({ length: 10 }, () => generateDoor(r2, { fromRoom: 'X' }).id);
    expect(ids1).toEqual(ids2);
  });

  it('buildDungeon places doors at corridor endpoints', () => {
    const d = buildDungeon({ rooms: 2, seed: 'doorDungeon' });
    expect(d.corridors.length).toBeGreaterThan(0);
    const c = d.corridors[0];
    const firstDoor = d.doors.find(dr => dr.fromRoom === c.from && dr.toRoom === c.to);
    const secondDoor = d.doors.find(dr => dr.fromRoom === c.to && dr.toRoom === c.from);
    expect(firstDoor).toBeDefined();
    expect(secondDoor).toBeDefined();
    expect(firstDoor!.location).toEqual(c.path[0]);
    expect(secondDoor!.location).toEqual(c.path[c.path.length - 1]);
    expect(DOOR_STATUSES).toContain(firstDoor!.status);
    expect(DOOR_STATUSES).toContain(secondDoor!.status);
  });

  it('MapGenerator places doors at corridor endpoints', () => {
    const generator = new MapGenerator('doorMap');
    const d = generator.generateDungeon({
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      allowDeadends: false,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      rooms: 2,
      width: 80,
      height: 60,
    });
    expect(d.corridors.length).toBeGreaterThan(0);
    const c = d.corridors[0];
    const firstDoor = d.doors.find(dr => dr.fromRoom === c.from && dr.toRoom === c.to);
    const secondDoor = d.doors.find(dr => dr.fromRoom === c.to && dr.toRoom === c.from);
    expect(firstDoor).toBeDefined();
    expect(secondDoor).toBeDefined();
    expect(firstDoor!.location).toEqual(c.path[0]);
    expect(secondDoor!.location).toEqual(c.path[c.path.length - 1]);
    expect(DOOR_STATUSES).toContain(firstDoor!.status);
    expect(DOOR_STATUSES).toContain(secondDoor!.status);
  });
});
