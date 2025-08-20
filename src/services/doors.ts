import { Door } from '../core/types';
import { pick } from './random';

export const DOOR_TYPES: Door['type'][] = ['normal', 'arch', 'portcullis', 'hole'];
export const DOOR_STATUSES: Door['status'][] = ['locked', 'trapped', 'barred', 'jammed', 'warded', 'secret'];

// Track how many doors have been generated for each RNG so we can
// assign friendly sequential numbers instead of random UUIDs.
const doorCounters = new WeakMap<() => number, number>();

export function generateDoor(
  r: () => number,
  endpoints: { fromRoom?: string; toRoom?: string; location?: { x: number; y: number } } = {},
): Door {
  const next = (doorCounters.get(r) || 0) + 1;
  doorCounters.set(r, next);

  return {
    id: `door-${next}`,
    type: pick(r, DOOR_TYPES),
    status: pick(r, DOOR_STATUSES),
    ...endpoints,
  };
}
