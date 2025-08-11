import { Dungeon } from '../core/types.js';
import { rng } from './random.js';
import { generateRooms } from './rooms.js';
import { connectRooms } from './corridors.js';

export function buildDungeon(opts: { rooms?: number; seed?: string }) : Dungeon {
  const seed = opts.seed ?? Math.random().toString(36).slice(2,10);
  const R = rng(seed);
  const n = Math.max(1, Math.floor(opts.rooms ?? 8));
  const rooms = generateRooms(n, 80, 60, R);
  const corridors = connectRooms(rooms);
  return { seed, rooms, corridors, encounters: {} };
}
