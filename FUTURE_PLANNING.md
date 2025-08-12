# locks.ts Future Plan

## 1. Purpose and Architectural Fit
The `locks` service will centralize logic for evaluating door locks within a dungeon. It complements the existing `key-items` and `pathfinder` services by offering a direct way to determine whether a door is locked and what key is required. System modules, such as `dfrpg`, can use it during the `enrich` phase to annotate dungeons with lock information.

## 2. Functions Breakdown
### `canKeyOpenDoor(door, key)`
* **Purpose:** check if a given `KeyItem` can open a `Door`.
* **Inputs:**
  * `door: Door` – the door being tested.
  * `key: KeyItem` – the key in question.
* **Outputs:**
  * `boolean` – `true` if the `door.id` matches `key.doorId`.

### `checkDoorLock(dungeon, doorId)`
* **Purpose:** report whether a door is locked and which key unlocks it.
* **Inputs:**
  * `dungeon: Dungeon` – the dungeon to inspect. May optionally contain `doors?: Door[]`.
  * `doorId: string` – identifier of the door.
* **Outputs:**
  * `{ doorId: string; locked: boolean; requiredKey?: KeyItem }` – lock status and any matching key.

## 3. locks.ts Implementation
```ts
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
```

## 4. Example Usage in a System Module
```ts
import { checkDoorLock } from '../services/locks';

export const dfrpg: SystemModule = {
  id: 'dfrpg',
  label: 'Dungeon Fantasy RPG',
  enrich(dungeon) {
    const lockInfo = checkDoorLock(dungeon, 'door-1');
    if (lockInfo.locked && lockInfo.requiredKey) {
      // annotate the dungeon or add narrative about the locked door
    }
    return dungeon;
  },
};
```

## 5. Future Improvements
* Support varying lock qualities (easy, average, superior) affecting difficulty or alternate solutions.
* Introduce key types (master keys, skeleton keys) beyond simple `doorId` matching.
* Allow multiple keys for a single door or multi-lock mechanisms.
* Integrate with the `pathfinder` service to pre-compute accessible areas based on lock complexity.
