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

  it('generateDoor produces consistent ids with same RNG', () => {
    const r1 = rng('doorIds');
    const r2 = rng('doorIds');
    const ids1 = Array.from({ length: 10 }, () => generateDoor(r1).id);
    const ids2 = Array.from({ length: 10 }, () => generateDoor(r2).id);
    expect(ids1).toEqual(ids2);
  });
});
