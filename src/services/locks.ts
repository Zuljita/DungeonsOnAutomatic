import { Dungeon, Door, ID, KeyItem } from '../core/types';

export interface LockCheckResult {
  doorId: ID;
  locked: boolean;
  requiredKey?: KeyItem;
}

/**
 * Return `true` when the key is meant for the given door.
 */
export function canKeyOpenDoor(door: Door, key: KeyItem): boolean {
  return key.doorId === door.id;
}

/**
 * Report whether a door is locked and which key unlocks it.
 *
 * The core {@link Dungeon} type does not currently track doors directly, so
 * callers supply any door collection (e.g., from the corridor builder or a
 * `PathGraph` edge list).
 */
export function checkDoorLock(
  dungeon: Dungeon,
  doorId: ID,
  doors: Door[] = [],
): LockCheckResult {
  const door = doors.find((d) => d.id === doorId);
  if (!door || door.status !== 'locked') {
    return { doorId, locked: false };
  }
  const requiredKey = dungeon.keyItems?.find((k) => canKeyOpenDoor(door, k));
  return { doorId, locked: true, requiredKey };
}

