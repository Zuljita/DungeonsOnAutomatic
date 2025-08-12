import { describe, it, expect } from 'vitest';
import { generateDoor, DOOR_TYPES, DOOR_STATUSES } from '../src/services/doors.js';
import { rng } from '../src/services/random.js';

describe('doors', () => {
  it('generateDoor produces valid types and statuses', () => {
    const r = rng('doorTest');
    const types = new Set<string>();
    const statuses = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const d = generateDoor(r);
      types.add(d.type);
      statuses.add(d.status);
    }
    expect([...types].sort()).toEqual([...DOOR_TYPES].sort());
    expect([...statuses].sort()).toEqual([...DOOR_STATUSES].sort());
  });
});
