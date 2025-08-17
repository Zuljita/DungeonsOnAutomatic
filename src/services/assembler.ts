import { Dungeon } from '../core/types';
import { rng } from './random';
import { generateRooms } from './rooms';
import { connectRooms } from './corridors';
import { generateDoor } from './doors';

export function buildDungeon(opts: { rooms?: number; seed?: string; width?: number; height?: number }): Dungeon {
  const seed = opts.seed ?? Math.random().toString(36).slice(2, 10);
  const R = rng(seed);
  const n = Math.max(1, Math.floor(opts.rooms ?? 8));
  // fall back to safe defaults when width/height are missing or invalid
  const width = Math.max(
    1,
    Math.floor(typeof opts.width === 'number' && !Number.isNaN(opts.width) ? opts.width : 80),
  );
  const height = Math.max(
    1,
    Math.floor(typeof opts.height === 'number' && !Number.isNaN(opts.height) ? opts.height : 60),
  );
  const rooms = generateRooms(n, width, height, R);
  const corridors = connectRooms(rooms, R);
  const doors = corridors.flatMap(c => [
    generateDoor(R, { fromRoom: c.from, toRoom: c.to, location: c.path[0] }),
    generateDoor(R, {
      fromRoom: c.to,
      toRoom: c.from,
      location: c.path[c.path.length - 1],
    }),
  ]);
  return { seed, rooms, corridors, doors, encounters: {}, rng: R };
}
