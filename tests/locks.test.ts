import { describe, expect, it } from 'vitest';
import { canKeyOpenDoor, checkDoorLock, LockService } from '../src/services/locks';
import {
  Dungeon,
  Door,
  KeyItem,
  PlacementRule,
  PlacementTarget,
} from '../src/core/types';

const lockedDoor: Door = { id: 'door-1', type: 'normal', status: 'locked' };
const unlockedDoor: Door = { id: 'door-2', type: 'arch', status: 'secret' };
const key: KeyItem = {
  id: 'key-1',
  doorId: 'door-1',
  name: 'Key',
  type: 'basic',
  placementRule: PlacementRule.REQUIRED,
  placementTarget: PlacementTarget.ROOM_FEATURE,
};

const baseDungeon: Dungeon = {
  seed: 's',
  rooms: [],
  corridors: [],
  doors: [lockedDoor, unlockedDoor],
  keyItems: [key],
};

describe('canKeyOpenDoor', () => {
  it('matches key to door by id', () => {
    expect(canKeyOpenDoor(lockedDoor, key)).toBe(true);
    expect(canKeyOpenDoor(unlockedDoor, key)).toBe(false);
  });
});

describe('checkDoorLock', () => {
  it('returns matching key when door is locked', () => {
    const result = checkDoorLock(baseDungeon, lockedDoor.id);
    expect(result.locked).toBe(true);
    expect(result.requiredKey).toBe(key);
  });

  it('reports unlocked when door not locked or missing', () => {
    const result1 = checkDoorLock(baseDungeon, unlockedDoor.id);
    expect(result1.locked).toBe(false);
    const result2 = checkDoorLock(baseDungeon, 'missing');
    expect(result2.locked).toBe(false);
  });

  it('omits requiredKey when no key is present', () => {
    const dungeon: Dungeon = { ...baseDungeon, keyItems: [] };
    const result = checkDoorLock(dungeon, lockedDoor.id);
    expect(result.locked).toBe(true);
    expect(result.requiredKey).toBeUndefined();
  });
});

describe('LockService', () => {
  it('locks doors according to percentage and supports magical locks', () => {
    const dungeon: Dungeon = {
      seed: 's',
      rooms: [],
      corridors: [],
      doors: [
        { id: 'd1', type: 'normal', status: 'warded' },
        { id: 'd2', type: 'normal', status: 'secret' },
      ],
    };
    const service = new LockService(() => 0); // deterministic
    const locks = service.generateLocks(dungeon, { lockPercentage: 1, allowMagicalLocks: true });
    expect(locks.length).toBe(2);
    expect(dungeon.doors.every((d) => d.status === 'locked')).toBe(true);
    expect(locks.some((l) => l.quality === 'magical')).toBe(true);
  });
});
