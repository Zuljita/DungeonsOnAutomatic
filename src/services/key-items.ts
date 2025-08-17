import { PlacementRule, PlacementTarget, type KeyItem, type Lock, type Dungeon, type Room, type ID } from '../core/types';
import { id } from './random';
import keyNameDefaults from '../data/key-names.json';
import { customDataLoader } from './custom-data-loader';

export interface KeyPlacementOptions {
  preferMonsterLoot?: boolean;
  allowRoomFeatures?: boolean;
  ensureAccessibility?: boolean;
}

class KeyItemService {
  private items = new Map<string, KeyItem>();
  private seq = 0;
  private rng: () => number;
  private keyNameParts = customDataLoader.getKeyNames(keyNameDefaults);

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  /**
   * Create keys for an array of locks
   */
  createKeysForLocks(locks: Lock[]): KeyItem[] {
    const keys: KeyItem[] = [];
    
    for (const lock of locks) {
      if (lock.requiresKey) {
        const key = this.createKeyForLock(lock);
        keys.push(key);
        this.items.set(key.id, key);
      }
    }
    
    return keys;
  }

  /**
   * Create a single key for a lock
   */
  private createKeyForLock(lock: Lock): KeyItem {
    const keyId = id('key', this.rng);
    const keyName = this.generateKeyName(lock);
    const keyDescription = this.generateKeyDescription(lock);
    
    // Determine placement strategy based on lock quality
    const { placementRule, placementTarget } = this.determineKeyPlacement(lock);

    return {
      id: keyId,
      doorId: lock.doorId,
      name: keyName,
      type: 'key',
      placementRule,
      placementTarget,
      description: keyDescription
    };
  }

  /**
   * Generate a thematic name for the key based on the lock
   */
  private generateKeyName(_lock: Lock): string {
    const { adjectives, materials, nouns } = this.keyNameParts;
    const adj = adjectives[Math.floor(this.rng() * adjectives.length)] || '';
    const mat = materials[Math.floor(this.rng() * materials.length)] || '';
    const noun = nouns[Math.floor(this.rng() * nouns.length)] || 'Key';
    return `${adj} ${mat} ${noun}`.trim();
  }

  /**
   * Generate description for the key
   */
  private generateKeyDescription(lock: Lock): string {
    const descriptions = {
      simple: 'A crudely made key with rough edges',
      average: 'A well-worn key showing signs of regular use',
      good: 'A carefully crafted key with smooth finish',
      fine: 'An intricately designed key with decorative elements',
      magical: 'A key that seems to shimmer with magical energy'
    };

    return descriptions[lock.quality];
  }

  /**
   * Determine placement strategy based on lock characteristics
   */
  private determineKeyPlacement(lock: Lock): { placementRule: PlacementRule; placementTarget: PlacementTarget } {
    const rand = this.rng();
    
    // Magical locks get special treatment
    if (lock.quality === 'magical') {
      return {
        placementRule: PlacementRule.REQUIRED,
        placementTarget: rand < 0.5 ? PlacementTarget.TREASURE_CHEST : PlacementTarget.ROOM_FEATURE
      };
    }
    
    // Fine locks are usually required
    if (lock.quality === 'fine') {
      return {
        placementRule: PlacementRule.REQUIRED,
        placementTarget: rand < 0.6 ? PlacementTarget.MONSTER_LOOT : PlacementTarget.TREASURE_CHEST
      };
    }
    
    // Other locks have varied placement
    const placementRule = rand < 0.8 ? PlacementRule.REQUIRED : PlacementRule.OPTIONAL;
    
    const targetRand = this.rng();
    let placementTarget: PlacementTarget;
    if (targetRand < 0.5) {
      placementTarget = PlacementTarget.MONSTER_LOOT;
    } else if (targetRand < 0.8) {
      placementTarget = PlacementTarget.ROOM_FEATURE;
    } else {
      placementTarget = PlacementTarget.TREASURE_CHEST;
    }
    
    return { placementRule, placementTarget };
  }

  /**
   * Place keys strategically within the dungeon
   */
  placeKeys(dungeon: Dungeon, keys: KeyItem[], options: KeyPlacementOptions = {}): void {
    const {
      preferMonsterLoot = true,
      allowRoomFeatures = true,
      ensureAccessibility = true
    } = options;

    // Create accessibility map if needed
    const accessibilityMap = ensureAccessibility ? this.buildAccessibilityMap(dungeon) : null;

    for (const key of keys) {
      const placement = this.findValidPlacement(dungeon, key, accessibilityMap, options);
      if (placement) {
        this.placeKeyInLocation(dungeon, key, placement);
      } else {
        console.warn(`Could not find valid placement for key: ${key.name}`);
        // Place in first room as fallback
        if (dungeon.rooms.length > 0) {
          this.placeKeyInLocation(dungeon, key, {
            type: PlacementTarget.ROOM_FEATURE,
            roomId: dungeon.rooms[0].id
          });
        }
      }
    }

    // Store keys in dungeon
    dungeon.keyItems = keys;
  }

  /**
   * Build map of which rooms are accessible without keys
   */
  private buildAccessibilityMap(dungeon: Dungeon): Map<ID, Set<ID>> {
    const accessibilityMap = new Map<ID, Set<ID>>();
    
    // For each room, determine which other rooms are accessible without keys
    for (const room of dungeon.rooms) {
      const accessible = new Set<ID>();
      const visited = new Set<ID>();
      const queue = [room.id];
      
      while (queue.length > 0) {
        const currentRoomId = queue.shift()!;
        if (visited.has(currentRoomId)) continue;
        visited.add(currentRoomId);
        accessible.add(currentRoomId);
        
        // Find corridors from this room
        const corridors = dungeon.corridors.filter(c => 
          c.from === currentRoomId || c.to === currentRoomId
        );
        
        for (const corridor of corridors) {
          const nextRoomId = corridor.from === currentRoomId ? corridor.to : corridor.from;
          
          // Check if there are locked doors blocking this path
          const blockingDoors = dungeon.doors.filter(door => 
            (door.fromRoom === currentRoomId && door.toRoom === nextRoomId) ||
            (door.fromRoom === nextRoomId && door.toRoom === currentRoomId)
          );
          
          const hasLockedDoor = blockingDoors.some(door => door.status === 'locked');
          
          if (!hasLockedDoor && !visited.has(nextRoomId)) {
            queue.push(nextRoomId);
          }
        }
      }
      
      accessibilityMap.set(room.id, accessible);
    }
    
    return accessibilityMap;
  }

  /**
   * Find a valid placement location for a key
   */
  private findValidPlacement(
    dungeon: Dungeon, 
    key: KeyItem, 
    accessibilityMap: Map<ID, Set<ID>> | null,
    options: KeyPlacementOptions
  ): { type: PlacementTarget; roomId: ID } | null {
    
    // Find which room the locked door connects to
    const lockedDoor = dungeon.doors.find(door => door.id === key.doorId);
    if (!lockedDoor) return null;

    // Get candidate rooms (accessible without this key)
    let candidateRooms: Room[];
    
    if (accessibilityMap) {
      // Find rooms accessible from entrance without keys
      const entranceRoom = this.findEntranceRoom(dungeon);
      const accessibleRoomIds = accessibilityMap.get(entranceRoom?.id || dungeon.rooms[0].id) || new Set();
      candidateRooms = dungeon.rooms.filter(room => accessibleRoomIds.has(room.id));
      
      // Exclude the room behind the locked door
      candidateRooms = candidateRooms.filter(room => 
        room.id !== lockedDoor.toRoom && room.id !== lockedDoor.fromRoom
      );
    } else {
      candidateRooms = dungeon.rooms;
    }

    if (candidateRooms.length === 0) {
      candidateRooms = dungeon.rooms; // Fallback
    }

    // Try to place based on placement target preference
    const targetOrder = this.getPlacementTargetOrder(key.placementTarget, options);
    
    for (const target of targetOrder) {
      const suitableRooms = this.findRoomsSuitableForTarget(candidateRooms, target, dungeon);
      if (suitableRooms.length > 0) {
        const selectedRoom = suitableRooms[Math.floor(this.rng() * suitableRooms.length)];
        return { type: target, roomId: selectedRoom.id };
      }
    }

    return null;
  }

  /**
   * Get ordered list of placement targets to try
   */
  private getPlacementTargetOrder(preferred: PlacementTarget, options: KeyPlacementOptions): PlacementTarget[] {
    const targets = [preferred];
    
    // Add other targets based on options
    if (options.preferMonsterLoot && preferred !== PlacementTarget.MONSTER_LOOT) {
      targets.push(PlacementTarget.MONSTER_LOOT);
    }
    
    if (options.allowRoomFeatures && preferred !== PlacementTarget.ROOM_FEATURE) {
      targets.push(PlacementTarget.ROOM_FEATURE);
    }
    
    // Always try treasure chest as fallback
    if (preferred !== PlacementTarget.TREASURE_CHEST) {
      targets.push(PlacementTarget.TREASURE_CHEST);
    }
    
    return targets;
  }

  /**
   * Find rooms suitable for a placement target type
   */
  private findRoomsSuitableForTarget(rooms: Room[], target: PlacementTarget, dungeon: Dungeon): Room[] {
    switch (target) {
      case PlacementTarget.MONSTER_LOOT:
        return rooms.filter(room => {
          const encounter = dungeon.encounters?.[room.id];
          return encounter?.monsters && encounter.monsters.length > 0;
        });
      
      case PlacementTarget.TREASURE_CHEST:
        return rooms.filter(room => {
          const encounter = dungeon.encounters?.[room.id];
          return encounter?.treasure && encounter.treasure.length > 0;
        });
      
      case PlacementTarget.ROOM_FEATURE:
        return rooms; // Any room can have features
      
      case PlacementTarget.NPC_POSSESSION:
        return rooms.filter(room => {
          const encounter = dungeon.encounters?.[room.id];
          return encounter?.monsters && encounter.monsters.some(m => m.tags?.includes('humanoid'));
        });
      
      default:
        return rooms;
    }
  }

  /**
   * Find the entrance room of the dungeon
   */
  private findEntranceRoom(dungeon: Dungeon): Room | null {
    return dungeon.rooms.find(room => 
      room.id === 'entrance' || 
      room.tags?.includes('entrance') ||
      room.kind === 'special'
    ) || dungeon.rooms[0] || null;
  }

  /**
   * Place a key in a specific location
   */
  private placeKeyInLocation(dungeon: Dungeon, key: KeyItem, placement: { type: PlacementTarget; roomId: ID }): void {
    key.locationId = placement.roomId;
    this.items.set(key.id, key);
    
    // Ensure the room has encounters object
    if (!dungeon.encounters) {
      dungeon.encounters = {};
    }
    if (!dungeon.encounters[placement.roomId]) {
      dungeon.encounters[placement.roomId] = {};
    }
    
    const encounter = dungeon.encounters[placement.roomId];
    
    // Add placement-specific logic here if needed
    // For now, keys are tracked in the keyItems array and locationId
  }

  generateKey(
    doorId: string,
    placementRule: PlacementRule,
    placementTarget: PlacementTarget,
  ): KeyItem {
    const keyId = `key-${++this.seq}`;
    const item: KeyItem = {
      id: keyId,
      doorId,
      name: `Key for ${doorId}`,
      type: 'key',
      placementRule,
      placementTarget,
    };
    this.items.set(keyId, item);
    return item;
  }

  getUnplacedKeys(): KeyItem[] {
    return Array.from(this.items.values()).filter(
      (i) => !i.locationId && i.placementRule !== PlacementRule.LOST,
    );
  }

  markAsPlaced(keyId: string, locationId: string): void {
    const item = this.items.get(keyId);
    if (item) {
      item.locationId = locationId;
    }
  }

  getKeysInLocation(locationId: string): KeyItem[] {
    return Array.from(this.items.values()).filter(
      (i) => i.locationId === locationId,
    );
  }

  reset(): void {
    this.items.clear();
    this.seq = 0;
  }
}

export const keyItemService = new KeyItemService();

export function createKeyItemService(rng: () => number): KeyItemService {
  return new KeyItemService(rng);
}

export { KeyItemService, PlacementRule, PlacementTarget };
export type { KeyItem };
