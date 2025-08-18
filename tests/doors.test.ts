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

  it('buildDungeon places doors on room perimeters', () => {
    const d = buildDungeon({ rooms: 2, seed: 'doorDungeon' });
    expect(d.corridors.length).toBeGreaterThan(0);
    const c = d.corridors[0];
    const firstDoor = d.doors.find(dr => dr.fromRoom === c.from && dr.toRoom === c.to);
    const secondDoor = d.doors.find(dr => dr.fromRoom === c.to && dr.toRoom === c.from);
    expect(firstDoor).toBeDefined();
    expect(secondDoor).toBeDefined();
    
    // Verify doors are placed correctly (either using actual door positions or corridor endpoints as fallback)
    const fromRoom = d.rooms.find(r => r.id === c.from);
    const toRoom = d.rooms.find(r => r.id === c.to);
    expect(fromRoom).toBeDefined();
    expect(toRoom).toBeDefined();
    
    // For rectangular rooms, doors should be on the room perimeter
    if (fromRoom!.shape === 'rectangular' || !fromRoom!.shapePoints) {
      const doorLoc = firstDoor!.location;
      const onPerimeter = (doorLoc.x === fromRoom!.x || doorLoc.x === fromRoom!.x + fromRoom!.w ||
                          doorLoc.y === fromRoom!.y || doorLoc.y === fromRoom!.y + fromRoom!.h) &&
                         (doorLoc.x >= fromRoom!.x && doorLoc.x <= fromRoom!.x + fromRoom!.w &&
                          doorLoc.y >= fromRoom!.y && doorLoc.y <= fromRoom!.y + fromRoom!.h);
      expect(onPerimeter).toBe(true);
    }
    
    expect(DOOR_STATUSES).toContain(firstDoor!.status);
    expect(DOOR_STATUSES).toContain(secondDoor!.status);
  });

  it('MapGenerator places doors on room perimeters', () => {
    const generator = new MapGenerator('doorMap');
    const d = generator.generateDungeon({
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      corridorWidth: 1,
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
    
    // Verify doors are placed correctly on room perimeters
    const fromRoom = d.rooms.find(r => r.id === c.from);
    const toRoom = d.rooms.find(r => r.id === c.to);
    expect(fromRoom).toBeDefined();
    expect(toRoom).toBeDefined();
    
    // For rectangular rooms, doors should be on the room perimeter
    if (fromRoom!.shape === 'rectangular' || !fromRoom!.shapePoints) {
      const doorLoc = firstDoor!.location;
      const onPerimeter = (doorLoc.x === fromRoom!.x || doorLoc.x === fromRoom!.x + fromRoom!.w ||
                          doorLoc.y === fromRoom!.y || doorLoc.y === fromRoom!.y + fromRoom!.h) &&
                         (doorLoc.x >= fromRoom!.x && doorLoc.x <= fromRoom!.x + fromRoom!.w &&
                          doorLoc.y >= fromRoom!.y && doorLoc.y <= fromRoom!.y + fromRoom!.h);
      expect(onPerimeter).toBe(true);
    }
    
    expect(DOOR_STATUSES).toContain(firstDoor!.status);
    expect(DOOR_STATUSES).toContain(secondDoor!.status);
  });
});
