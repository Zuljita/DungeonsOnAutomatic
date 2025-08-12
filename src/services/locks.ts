import { Dungeon, Door, KeyItem } from '../core/types';

export interface LockCheckResult {
  doorId: string;
  locked: boolean;
  requiredKey?: KeyItem;
}

export function canKeyOpenDoor(door: Door, key: KeyItem): boolean {
  return key.doorId === door.id;
}

export function checkDoorLock(
  dungeon: Dungeon & { doors?: Door[] },
  doorId: string,
): LockCheckResult {
  const door = dungeon.doors?.find((d) => d.id === doorId);
  if (!door) {
    return { doorId, locked: false };
  }
  if (door.status !== 'locked') {
    return { doorId, locked: false };
  }
  const requiredKey = dungeon.keyItems?.find((k) => canKeyOpenDoor(door, k));
  return { doorId, locked: true, requiredKey };
}

