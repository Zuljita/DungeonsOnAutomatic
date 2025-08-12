import { Dungeon } from '../core/types';
import { rng } from './random';
import { generateRooms } from './rooms';
import { connectRooms } from './corridors';
import { generateDoor } from './doors';

export function buildDungeon(opts: { rooms?: number; seed?: string }) : Dungeon {
  const seed = opts.seed ?? Math.random().toString(36).slice(2,10);
  const R = rng(seed);
  const n = Math.max(1, Math.floor(opts.rooms ?? 8));
  const rooms = generateRooms(n, 80, 60, R);
  const corridors = connectRooms(rooms);
  const doors = corridors.flatMap(() => [generateDoor(R), generateDoor(R)]);
  return { seed, rooms, corridors, doors, encounters: {} };
}
