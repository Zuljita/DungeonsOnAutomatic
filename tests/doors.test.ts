import { describe, it, expect } from 'vitest';
import { generateDoor, DOOR_TYPES, DOOR_STATUSES, DOOR_TYPE_COMPATIBLE_STATUSES } from '../src/services/doors.js';
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
    // Statuses should be a subset of all possible statuses since some combinations are invalid
    expect([...statuses].every(status => DOOR_STATUSES.includes(status))).toBe(true);
  });

  it('generateDoor respects door type and status compatibility', () => {
    const r = rng('doorCompatibilityTest');
    for (let i = 0; i < 200; i++) {
      const door = generateDoor(r, { fromRoom: 'A', toRoom: 'B', location: { x: i, y: i } });
      const compatibleStatuses = DOOR_TYPE_COMPATIBLE_STATUSES[door.type];
      expect(compatibleStatuses).toContain(door.status);
      
      // Specifically test the problematic combinations from the GitHub issue
      if (door.type === 'hole' || door.type === 'arch') {
        expect(['locked', 'barred', 'jammed']).not.toContain(door.status);
        expect(['trapped', 'warded', 'secret']).toContain(door.status);
      }
    }
  });

  it('fixes the specific GitHub issue #184 - holes and arches cannot be barred', () => {
    // Test the exact seed from the GitHub issue report
    const r = rng('1');
    
    // Generate many doors with this seed to ensure we get holes and arches
    const doors = Array.from({ length: 50 }, () => generateDoor(r));
    
    // Verify no hole or arch has inappropriate statuses
    const holesAndArches = doors.filter(d => d.type === 'hole' || d.type === 'arch');
    expect(holesAndArches.length).toBeGreaterThan(0); // Ensure we actually test some
    
    for (const door of holesAndArches) {
      // These statuses should never appear on holes or arches
      expect(door.status).not.toBe('locked');
      expect(door.status).not.toBe('barred'); 
      expect(door.status).not.toBe('jammed');
      
      // Only these statuses should appear
      expect(['trapped', 'warded', 'secret']).toContain(door.status);
    }
  });

  it('generateDoor produces consistent ids with same RNG', () => {
    const r1 = rng('doorIds');
    const r2 = rng('doorIds');
    const ids1 = Array.from({ length: 5 }, () => generateDoor(r1, { fromRoom: 'X' }).id);
    const ids2 = Array.from({ length: 5 }, () => generateDoor(r2, { fromRoom: 'X' }).id);
    expect(ids1).toEqual(['door-1', 'door-2', 'door-3', 'door-4', 'door-5']);
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
