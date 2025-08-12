import { describe, it, expect } from 'vitest';
import { generateDoor, DOOR_TYPES, DOOR_STATUSES } from '../src/services/doors.js';
import { rng } from '../src/services/random.js';

describe('doors', () => {
  it('generateDoor produces valid types and statuses', () => {
    const r = rng('doorTest');
    for (let i = 0; i < 100; i++) {
      const d = generateDoor(r);
      expect(DOOR_TYPES).toContain(d.type);
      expect(DOOR_STATUSES).toContain(d.status);
    }
  });

  it('generateDoor produces deterministic ids', () => {
    const d1 = generateDoor(rng('doorId'));
    const d2 = generateDoor(rng('doorId'));
    expect(d1.id).toBe(d2.id);
  });
});
