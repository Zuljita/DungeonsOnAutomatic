import { Door } from '../core/types';
import { id, pick } from './random';

export const DOOR_TYPES: Door['type'][] = ['normal', 'arch', 'portcullis', 'hole'];
export const DOOR_STATUSES: Door['status'][] = ['locked', 'trapped', 'barred', 'jammed', 'warded', 'secret'];

export function generateDoor(r: () => number): Door {
  return { id: id('door', r), type: pick(r, DOOR_TYPES), status: pick(r, DOOR_STATUSES) };
}
