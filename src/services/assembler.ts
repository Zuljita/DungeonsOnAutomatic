import { Dungeon } from '../core/types';
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
  // Always use MapGenerator for consistent behavior
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
