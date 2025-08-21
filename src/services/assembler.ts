import { Dungeon } from '../core/types';
import { MapGenerator, type MapGenerationOptions } from './map-generator';
import { dungeonTemplateService, type DungeonTemplate } from './dungeon-templates';

export interface BuildDungeonOptions {
  rooms?: number;
  seed?: string;
  width?: number;
  height?: number;
  // Template support
  template?: string; // Template ID to apply
  // Advanced map options (delegated to MapGenerator)
  layoutType?: MapGenerationOptions['layoutType'];
  roomLayout?: MapGenerationOptions['roomLayout'];
  roomSize?: MapGenerationOptions['roomSize'];
  roomShape?: MapGenerationOptions['roomShape'];
  corridorType?: MapGenerationOptions['corridorType'];
  pathfindingAlgorithm?: 'manhattan' | 'astar' | 'jumppoint' | 'dijkstra';
  corridorWidth?: MapGenerationOptions['corridorWidth'];
  allowDeadends?: boolean;
  stairsUp?: boolean;
  stairsDown?: boolean;
  entranceFromPeriphery?: boolean;
}

export function buildDungeon(opts: BuildDungeonOptions): Dungeon {
  // Check if a template should be applied
  let templateOptions: Partial<MapGenerationOptions> = {};
  if (opts.template) {
    const template = dungeonTemplateService.getTemplate(opts.template);
    if (template) {
      templateOptions = template.mapOptions;
      console.log(`Applying template: ${template.name}`);
    } else {
      console.warn(`Template '${opts.template}' not found, using defaults`);
    }
  }

  // Always use MapGenerator for consistent behavior
  const generator = new MapGenerator(opts.seed);
  
  // Build options with template as base, then user options as overrides
  const options: MapGenerationOptions = {
    // Template defaults first
    ...templateOptions,
    
    // User overrides second (explicit options always take precedence)
    rooms: Math.max(1, Math.floor(opts.rooms ?? templateOptions.rooms ?? 8)),
    width: Math.max(
      1,
      Math.floor(typeof opts.width === 'number' && !Number.isNaN(opts.width) 
        ? opts.width 
        : templateOptions.width ?? 80),
    ),
    height: Math.max(
      1,
      Math.floor(typeof opts.height === 'number' && !Number.isNaN(opts.height) 
        ? opts.height 
        : templateOptions.height ?? 60),
    ),
    seed: opts.seed,
    layoutType: opts.layoutType ?? templateOptions.layoutType ?? 'rectangle',
    roomLayout: opts.roomLayout ?? templateOptions.roomLayout ?? 'scattered',
    roomSize: opts.roomSize ?? templateOptions.roomSize ?? 'medium',
    roomShape: opts.roomShape ?? templateOptions.roomShape ?? 'rectangular',
    corridorType: opts.corridorType ?? templateOptions.corridorType ?? 'straight',
    pathfindingAlgorithm: opts.pathfindingAlgorithm ?? 'manhattan',
    corridorWidth: opts.corridorWidth ?? templateOptions.corridorWidth ?? 1,
    allowDeadends: opts.allowDeadends ?? templateOptions.allowDeadends ?? true,
    stairsUp: opts.stairsUp ?? templateOptions.stairsUp ?? false,
    stairsDown: opts.stairsDown ?? templateOptions.stairsDown ?? false,
    entranceFromPeriphery: opts.entranceFromPeriphery ?? templateOptions.entranceFromPeriphery ?? false,
  };
  
  return generator.generateDungeon(options);
}
