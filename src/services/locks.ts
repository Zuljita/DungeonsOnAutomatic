import { Dungeon, Door, ID, KeyItem, Lock } from '../core/types';
import { id } from './random';

export interface LockCheckResult {
  doorId: ID;
  locked: boolean;
  requiredKey?: KeyItem;
}

export interface LockGenerationOptions {
  lockPercentage?: number; // Percentage of doors to lock (0-1)
  preferImportantDoors?: boolean; // Prioritize locked/secret doors
  allowMagicalLocks?: boolean; // Include magical quality locks
}

/**
 * Service for generating and managing locks in dungeons
 */
export class LockService {
  private rng: () => number;
  private lockSequence = 0;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  /**
   * Generate locks for doors in the dungeon
   * Returns array of Lock objects that were created
   */
  generateLocks(dungeon: Dungeon, options: LockGenerationOptions = {}): Lock[] {
    const {
      lockPercentage = 0.3,
      preferImportantDoors = true,
      allowMagicalLocks = false
    } = options;

    const locks: Lock[] = [];
    const candidateDoors = this.selectDoorsForLocking(dungeon.doors, lockPercentage, preferImportantDoors);

    for (const door of candidateDoors) {
      const lock = this.createLockForDoor(door, allowMagicalLocks);
      locks.push(lock);
      
      // Mark door as locked
      door.status = 'locked';
    }

    // Store locks in dungeon
    dungeon.locks = locks;
    
    return locks;
  }

  /**
   * Select which doors should be locked based on criteria
   */
  private selectDoorsForLocking(doors: Door[], lockPercentage: number, preferImportant: boolean): Door[] {
    const candidates: Door[] = [];
    
    // Filter doors that can be locked (exclude those already locked and door types that can't be locked)
    const lockableDoors = doors.filter(door => 
      door.status !== 'locked' && door.type !== 'arch' && door.type !== 'hole' // arches and holes can't be locked
    );

    if (preferImportant) {
      // Prioritize doors that are already special (secret, trapped, etc.)
      const importantDoors = lockableDoors.filter(door => 
        door.status === 'secret' || door.status === 'trapped' || door.status === 'warded'
      );
      
      // Add some important doors first
      candidates.push(...importantDoors.slice(0, Math.ceil(importantDoors.length * 0.7)));
    }

    // Calculate how many more doors we need
    const totalNeeded = Math.max(1, Math.floor(lockableDoors.length * lockPercentage));
    const remaining = totalNeeded - candidates.length;

    if (remaining > 0) {
      // Add random doors from the remaining pool
      const remainingDoors = lockableDoors.filter(door => !candidates.includes(door));
      
      // Shuffle and take the needed amount
      for (let i = remainingDoors.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [remainingDoors[i], remainingDoors[j]] = [remainingDoors[j], remainingDoors[i]];
      }
      
      candidates.push(...remainingDoors.slice(0, remaining));
    }

    return candidates;
  }

  /**
   * Create a lock for a specific door
   */
  private createLockForDoor(door: Door, allowMagical: boolean): Lock {
    const lockId = id('lock', this.rng);
    
    // Determine lock quality based on door type and status
    const quality = this.determineLockQuality(door, allowMagical);
    
    // Determine material based on door type
    const material = this.determineLockMaterial(door);
    
    // Generate description
    const description = this.generateLockDescription(quality, material, door);

    return {
      id: lockId,
      doorId: door.id,
      quality,
      material,
      requiresKey: true,
      description
    };
  }

  /**
   * Determine lock quality based on door characteristics
   */
  private determineLockQuality(door: Door, allowMagical: boolean): Lock['quality'] {
    const rand = this.rng();
    
    // Higher quality for special doors
    if (door.status === 'warded' && allowMagical && rand < 0.3) {
      return 'magical';
    }
    
    if (door.status === 'secret' || door.status === 'trapped') {
      if (rand < 0.4) return 'fine';
      if (rand < 0.7) return 'good';
      return 'average';
    }
    
    // Normal doors - weighted toward average quality
    if (rand < 0.1) return 'fine';
    if (rand < 0.3) return 'good';
    if (rand < 0.8) return 'average';
    return 'simple';
  }

  /**
   * Determine lock material based on door type
   */
  private determineLockMaterial(door: Door): Lock['material'] {
    const rand = this.rng();
    
    if (door.type === 'portcullis') {
      return rand < 0.6 ? 'iron' : 'steel';
    }
    
    // Normal doors - weighted distribution
    if (rand < 0.1) return 'steel';
    if (rand < 0.3) return 'iron';
    if (rand < 0.7) return 'wood';
    return 'stone';
  }

  /**
   * Generate descriptive text for the lock
   */
  private generateLockDescription(quality: Lock['quality'], material: Lock['material'], door: Door): string {
    const qualityDescriptors = {
      simple: 'crude',
      average: 'sturdy',
      good: 'well-crafted',
      fine: 'expertly made',
      magical: 'magically enhanced'
    };

    const materialDescriptors = {
      wood: 'wooden',
      stone: 'stone',
      iron: 'iron',
      steel: 'steel'
    };

    return `A ${qualityDescriptors[quality]} ${materialDescriptors[material]} lock`;
  }

  reset(): void {
    this.lockSequence = 0;
  }
}

/**
 * Return `true` when the key is meant for the given door.
 */
export function canKeyOpenDoor(door: Door, key: KeyItem): boolean {
  return key.doorId === door.id;
}

/**
 * Report whether a door is locked and which key unlocks it.
 */
export function checkDoorLock(
  dungeon: Dungeon,
  doorId: ID,
  doors: Door[] = dungeon.doors,
): LockCheckResult {
  const door = doors.find((d) => d.id === doorId);
  if (!door || door.status !== 'locked') {
    return { doorId, locked: false };
  }
  const requiredKey = dungeon.keyItems?.find((k) => canKeyOpenDoor(door, k));
  return { doorId, locked: true, requiredKey };
}

