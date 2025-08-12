import { Dungeon } from '../core/types';
import { rng as createRng } from './random';
import { generateRooms } from './rooms';
import { connectRooms } from './corridors';

export function buildDungeon(opts: {
  rooms?: number;
  seed?: string;
  rng?: () => number;
}): Dungeon {
  const seed = opts.seed ?? Math.random().toString(36).slice(2, 10);
  const R = opts.rng ?? createRng(seed);
  const n = Math.max(1, Math.floor(opts.rooms ?? 8));
  const rooms = generateRooms(n, 80, 60, R);
  const corridors = connectRooms(rooms);
  return { seed, rooms, corridors, encounters: {} };
}
