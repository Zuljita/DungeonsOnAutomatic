import { Room } from '../core/types';
import { id, pick } from './random';

const KINDS: Room['kind'][] = ['chamber', 'hall', 'cavern', 'lair', 'special'];

/** Generate N non-overlapping rooms within a rectangular grid.
 * Rooms will have at least one tile of padding between them to leave space
 * for corridors so they never touch or overlap.
 */
export function generateRooms(n: number, width = 80, height = 60, r: () => number): Room[] {
  const rooms: Room[] = [];
  let attempts = 0;
  while (rooms.length < n && attempts < n * 50) {
    attempts++;
    const w = 4 + Math.floor(r() * 8); // 4..11
    const h = 4 + Math.floor(r() * 8);
    const x = 1 + Math.floor(r() * Math.max(1, width - w - 1));
    const y = 1 + Math.floor(r() * Math.max(1, height - h - 1));
    const kind = pick(r, KINDS);
    const candidate: Room = { id: id('room'), kind, x, y, w, h };
    if (!rooms.some(a => overlaps(a, candidate))) {
      rooms.push(candidate);
    }
  }
  return rooms;
}

/**
 * Determine whether two rooms overlap or touch.  The extra +/-1 padding
 * ensures there is always at least one tile gap between any two rooms.
 */
function overlaps(a: Room, b: Room): boolean {
  return !(
    a.x + a.w + 1 <= b.x ||
    b.x + b.w + 1 <= a.x ||
    a.y + a.h + 1 <= b.y ||
    b.y + b.h + 1 <= a.y
  );
}
