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

### `checkDoorLock(dungeon, doorId, doors?)`
* **Purpose:** report whether a door is locked and which key unlocks it.
* **Inputs:**
  * `dungeon: Dungeon` – the dungeon to inspect for key items.
  * `doorId: ID` – identifier of the door.
  * `doors?: Door[]` – optional collection of doors available in the dungeon.
* **Outputs:**
  * `{ doorId: ID; locked: boolean; requiredKey?: KeyItem }` – lock status and any matching key.

## 3. locks.ts Implementation
```ts
import { Dungeon, Door, ID, KeyItem } from '../core/types';

export interface LockCheckResult {
  doorId: ID;
  locked: boolean;
  requiredKey?: KeyItem;
}

export function canKeyOpenDoor(door: Door, key: KeyItem): boolean {
  return key.doorId === door.id;
}

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
```

## 4. Integration with `corridors` and `pathfinder`
The core `Dungeon` type lacks a canonical list of doors. Corridors and the
`pathfinder` service currently track door information through their own data
structures (e.g., `PathGraph` edges). The `locks` service therefore accepts an
explicit list of `Door` objects rather than assuming a `dungeon.doors` field.

* **`corridors.ts`:** corridor generation can attach `Door` instances to the
  connections it creates and expose them as a door list for the lock service.
* **`pathfinder.ts`:** pathfinding algorithms may consult `checkDoorLock` to
  determine if an edge's door is traversable or requires a key, keeping lock
  evaluation in one place.

## 5. Example Usage in a System Module
```ts
import { checkDoorLock } from '../services/locks';

export const dfrpg: SystemModule = {
  id: 'dfrpg',
  label: 'Dungeon Fantasy RPG',
  enrich(dungeon) {
    const dungeonDoors = [];
    const lockInfo = checkDoorLock(dungeon, 'door-1', dungeonDoors);
    if (lockInfo.locked && lockInfo.requiredKey) {
      // annotate the dungeon or add narrative about the locked door
    }
    return dungeon;
  },
};
```

## 6. Future Improvements
* Support varying lock qualities (easy, average, superior) affecting difficulty or alternate solutions.
* Introduce key types (master keys, skeleton keys) beyond simple `doorId` matching.
* Allow multiple keys for a single door or multi-lock mechanisms.
* Integrate with the `pathfinder` service to pre-compute accessible areas based on lock complexity.
