import { Dungeon } from '../core/types';
import { rng } from './random';
import { generateRooms } from './rooms';
import { connectRooms } from './corridors';
import { generateDoor } from './doors';
import { MapGenerator, type MapGenerationOptions } from './map-generator';

export interface BuildDungeonOptions {
  rooms?: number;
  seed?: string;
  width?: number;
  height?: number;
  // Advanced map options (delegated to MapGenerator)
  layoutType?: MapGenerationOptions['layoutType'];
  roomLayout?: MapGenerationOptions['roomLayout'];
  roomSize?: MapGenerationOptions['roomSize'];
  roomShape?: MapGenerationOptions['roomShape'];
  corridorType?: MapGenerationOptions['corridorType'];
  allowDeadends?: boolean;
  stairsUp?: boolean;
  stairsDown?: boolean;
  entranceFromPeriphery?: boolean;
}

export function buildDungeon(opts: BuildDungeonOptions): Dungeon {
  // If a layout type or other advanced option is provided, delegate to MapGenerator
  if (opts.layoutType || opts.roomLayout || opts.roomSize || opts.roomShape || opts.corridorType) {
    const generator = new MapGenerator(opts.seed);
    const options: MapGenerationOptions = {
      rooms: Math.max(1, Math.floor(opts.rooms ?? 8)),
      width: Math.max(
        1,
        Math.floor(typeof opts.width === 'number' && !Number.isNaN(opts.width) ? opts.width : 80),
      ),
      height: Math.max(
        1,
        Math.floor(typeof opts.height === 'number' && !Number.isNaN(opts.height) ? opts.height : 60),
      ),
      seed: opts.seed,
      layoutType: opts.layoutType ?? 'rectangle',
      roomLayout: opts.roomLayout ?? 'scattered',
      roomSize: opts.roomSize ?? 'medium',
      roomShape: opts.roomShape ?? 'rectangular',
      corridorType: opts.corridorType ?? 'straight',
      allowDeadends: opts.allowDeadends ?? true,
      stairsUp: opts.stairsUp ?? false,
      stairsDown: opts.stairsDown ?? false,
      entranceFromPeriphery: opts.entranceFromPeriphery ?? false,
    };
    return generator.generateDungeon(options);
  }

  // Basic/default dungeon generation
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
