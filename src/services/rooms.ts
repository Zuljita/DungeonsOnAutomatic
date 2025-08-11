import { Room } from '../core/types.js';
import { id, pick } from './random.js';

const KINDS: Room['kind'][] = ['chamber', 'hall', 'cavern', 'lair', 'special'];

/** Generate N non-overlapping rooms within a rectangular grid. */
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

function overlaps(a: Room, b: Room): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}
