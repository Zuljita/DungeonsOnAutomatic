import { Dungeon } from '../core/types';
import { rng } from './random';
import { generateRooms } from './rooms';
import { connectRooms } from './corridors';

export function buildDungeon(opts: { rooms?: number; seed?: string; width?: number; height?: number }) : Dungeon {
  const seed = opts.seed ?? Math.random().toString(36).slice(2,10);
  const R = rng(seed);
  const n = Math.max(1, Math.floor(opts.rooms ?? 8));
  const width = Math.max(1, Math.floor(opts.width ?? 80));
  const height = Math.max(1, Math.floor(opts.height ?? 60));
  const rooms = generateRooms(n, width, height, R);
  const corridors = connectRooms(rooms);
  return { seed, rooms, corridors, encounters: {} };
}
