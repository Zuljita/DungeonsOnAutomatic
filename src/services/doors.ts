import { Door } from '../core/types';
import { pick } from './random';

export const DOOR_TYPES: Door['type'][] = ['normal', 'arch', 'portcullis', 'hole'];
export const DOOR_STATUSES: Door['status'][] = ['locked', 'trapped', 'barred', 'jammed', 'warded', 'secret'];

// Define which statuses are valid for each door type
export const DOOR_TYPE_COMPATIBLE_STATUSES: Record<Door['type'], Door['status'][]> = {
  'normal': ['locked', 'trapped', 'barred', 'jammed', 'warded', 'secret'], // Physical doors can have any status
  'portcullis': ['locked', 'trapped', 'barred', 'jammed', 'warded', 'secret'], // Mechanical doors can have any status
  'arch': ['trapped', 'warded', 'secret'], // Open archways can't be locked/barred/jammed, but can have magical barriers or traps
  'hole': ['trapped', 'warded', 'secret'], // Open holes can't be locked/barred/jammed, but can have magical barriers or traps
};

// Track how many doors have been generated for each RNG so we can
// assign friendly sequential numbers instead of random UUIDs.
const doorCounters = new WeakMap<() => number, number>();

export function generateDoor(
  r: () => number,
  endpoints: { fromRoom?: string; toRoom?: string; location?: { x: number; y: number } } = {},
): Door {
  const next = (doorCounters.get(r) || 0) + 1;
  doorCounters.set(r, next);

  // Select door type first
  const type = pick(r, DOOR_TYPES);
  
  // Then select a compatible status for that door type
  const compatibleStatuses = DOOR_TYPE_COMPATIBLE_STATUSES[type];
  const status = pick(r, compatibleStatuses);

  return {
    id: `door-${next}`,
    type,
    status,
    ...endpoints,
  };
}
