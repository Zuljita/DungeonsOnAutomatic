import { z } from 'zod';
import type { Dungeon, Room, Monster, Trap, Treasure, SystemModule, RNG, RoomShape } from './types';

// === Plugin Metadata ===

export interface PluginMetadata {
  id: string; // Simple plugin identifier (e.g., "dnd5e", "my-homebrew")
  version?: string; // Plugin version (defaults to "1.0.0")
  description?: string; // Brief description
  author?: string; // Author name
  tags?: string[]; // Optional tags for discovery
}

// === Simple Error Handling ===

export interface PluginError {
  message: string;
  plugin?: string;
  cause?: unknown;
}

// === Plugin Configuration ===

export interface PluginConfig {
  [key: string]: unknown; // Whatever the plugin needs
}

// === Base Plugin Interface ===

export interface BasePlugin {
  metadata: PluginMetadata;
  
  // Optional lifecycle hooks
  initialize?(config?: PluginConfig): Promise<void> | void;
  cleanup?(): Promise<void> | void;
  
  // Simple configuration
  getDefaultConfig?(): PluginConfig;
}

// === System Plugin Interface ===

export interface SystemOptions extends Record<string, unknown> {
  rng?: RNG;
  level?: number;
  tags?: {
    monsters?: { requiredTags?: string[]; excludedTags?: string[] };
    traps?: { requiredTags?: string[]; excludedTags?: string[] };
    treasure?: { requiredTags?: string[]; excludedTags?: string[] };
  };
}

export interface SystemPlugin extends BasePlugin {
  // System-specific functionality
  id: string;
  label: string;
  enrich(dungeon: Dungeon, options?: SystemOptions): Promise<Dungeon> | Dungeon;
}

// === Export Plugin Interface ===

export interface ExportOptions extends Record<string, unknown> {
  filename?: string;
  pretty?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ExportResult {
  format: string;
  data: unknown; // Format-specific data
  contentType?: string;
  filename?: string;
  metadata?: Record<string, unknown>;
}

export interface ExportPlugin extends BasePlugin {
  supportedFormats: string[]; // e.g., ['roll20', 'foundry-v11']
  
  export(
    dungeon: Dungeon, 
    format: string, 
    options?: ExportOptions
  ): Promise<ExportResult> | ExportResult;
}

// === Room Generator Plugin Interface ===

export interface RoomGenerationConfig {
  roomCount: number;
  minRoomSize: number;
  maxRoomSize: number;
  allowOverlap: boolean;
  preferredShapes?: RoomShape[];
  customConstraints?: Record<string, unknown>;
}

export interface RoomGeneratorPlugin extends BasePlugin {
  generateRooms(
    config: RoomGenerationConfig, 
    rng: RNG
  ): Promise<Room[]> | Room[];
}

// === Room Shape Plugin Interface ===

export interface ShapePreferences {
  rectangular?: number;     // weight for rectangular rooms
  circular?: number;        // weight for circular rooms  
  hexagonal?: number;       // weight for hexagonal rooms
  octagonal?: number;       // weight for octagonal rooms
  irregular?: number;       // weight for irregular rooms
  'L-shaped'?: number;      // weight for L-shaped rooms
  'T-shaped'?: number;      // weight for T-shaped rooms
  cross?: number;           // weight for cross-shaped rooms
}

export interface RoomShapePlugin extends BasePlugin {
  // Shape generation algorithms
  generateShape(preferences?: ShapePreferences, roomKind?: string, rng?: RNG): RoomShape;
  generateShapePoints(
    shape: RoomShape, 
    centerX: number, 
    centerY: number, 
    width: number, 
    height: number, 
    rng?: RNG
  ): { x: number; y: number }[];
  
  // Available shapes and preferences
  getSupportedShapes(): RoomShape[];
  getDefaultPreferences(): ShapePreferences;
  getKindPreferences(roomKind: string): Partial<ShapePreferences>;
}

// === Render Plugin Interface ===

export interface RenderOptions extends Record<string, unknown> {
  style?: string;
  theme?: 'light' | 'dark' | 'sepia';
  cellSize?: number;
  showGrid?: boolean;
  wobbleIntensity?: number;
  wallThickness?: number;
  customOptions?: Record<string, unknown>;
}

export interface RenderResult {
  format: string;
  data: string; // SVG content or other format data
  contentType: string;
  metadata?: Record<string, unknown>;
}

export interface RenderPlugin extends BasePlugin {
  supportedStyles: string[]; // e.g., ['hand-drawn', 'sketchy']
  
  render(
    dungeon: Dungeon, 
    style: string,
    options?: RenderOptions
  ): Promise<RenderResult> | RenderResult;
}

// === Encounter Plugin Interface ===

export interface EncounterContext {
  dungeonLevel: number;
  roomType: Room['kind'];
  roomSize: number; // Room area or approximate size
  adjacentRooms: Room[];
  partyLevel?: number;
  systemId: string;
  dungeonSeed?: string;
}

export interface EncounterOptions extends Record<string, unknown> {
  difficulty?: 'trivial' | 'easy' | 'moderate' | 'hard' | 'extreme';
  encounterTypes?: string[]; // Preferred encounter types
  maxMonsters?: number;
  maxTraps?: number;
  treasureChance?: number;
}

export interface EnvironmentalHazard {
  name: string;
  description: string;
  effect?: string;
  tags?: string[];
}

export interface Encounter {
  monsters?: Monster[];
  traps?: Trap[];
  treasure?: Treasure[];
  environmental?: EnvironmentalHazard[];
  metadata?: Record<string, unknown>;
}

export interface EncounterPlugin extends BasePlugin {
  generateEncounter(
    room: Room,
    context: EncounterContext,
    options?: EncounterOptions
  ): Promise<Encounter> | Encounter;
  
  getEncounterTypes?(): string[]; // Optional
}

// === Plugin Management ===

export type PluginType = string; // Flexible - plugins can be whatever they want

export interface PluginInfo {
  metadata: PluginMetadata;
  type?: PluginType; // Optional categorization
  installed: boolean;
  enabled: boolean;
  loadPath?: string;
  source?: string; // Where it was installed from
  installDate?: Date;
}

export interface PluginQuery {
  tags?: string[];
  author?: string;
  search?: string; // Simple text search
}

// === Plugin Environment ===

export interface PluginEnvironment {
  // DOA APIs
  core: {
    types: typeof import('./types');
  };
  
  // Standard environment
  console: Console;
  random: RNG;
  
  // Helper functions for common tasks
  helpers: {
    readJsonFile: (path: string) => Promise<unknown>;
    writeJsonFile: (path: string, data: unknown) => Promise<void>;
  };
}

export interface PluginLoadOptions {
  enableValidation?: boolean;
  configPath?: string;
}

// === Simple Validation ===

export const PluginMetadataSchema = z.object({
  id: z.string().min(1), // Just a non-empty string
  version: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// === Type Guards ===

export function isSystemPlugin(plugin: BasePlugin): plugin is SystemPlugin {
  return 'enrich' in plugin && typeof plugin.enrich === 'function';
}

export function isExportPlugin(plugin: BasePlugin): plugin is ExportPlugin {
  return 'supportedFormats' in plugin && 'export' in plugin;
}

export function isRoomGeneratorPlugin(plugin: BasePlugin): plugin is RoomGeneratorPlugin {
  return 'generateRooms' in plugin && typeof plugin.generateRooms === 'function';
}

export function isRoomShapePlugin(plugin: BasePlugin): plugin is RoomShapePlugin {
  return 'generateShape' in plugin && 'generateShapePoints' in plugin && typeof plugin.generateShape === 'function';
}

export function isRenderPlugin(plugin: BasePlugin): plugin is RenderPlugin {
  return 'supportedStyles' in plugin && 'render' in plugin && typeof plugin.render === 'function';
}

export function isEncounterPlugin(plugin: BasePlugin): plugin is EncounterPlugin {
  return 'generateEncounter' in plugin && 'getEncounterTypes' in plugin;
}

// === Utility Functions ===

export function parsePluginMetadata(metadata: unknown): PluginMetadata | null {
  try {
    return PluginMetadataSchema.parse(metadata);
  } catch (error) {
    console.warn('Invalid plugin metadata:', error);
    return null;
  }
}

export function createPluginError(message: string, plugin?: string, cause?: unknown): PluginError {
  return { message, plugin, cause };
}

// === Legacy Support ===

/**
 * Convert legacy SystemModule to new SystemPlugin interface
 * for backward compatibility during transition period.
 */
export function wrapLegacySystemModule(
  module: SystemModule,
  metadata?: Partial<PluginMetadata>
): SystemPlugin {
  const defaultMetadata: PluginMetadata = {
    id: module.id,
    version: '1.0.0',
    description: `Legacy system: ${module.label}`,
    author: 'DOA Core',
    ...metadata
  };

  return {
    ...module,
    metadata: defaultMetadata,
    
    // Optional methods with defaults
    initialize: undefined,
    cleanup: undefined,
    getDefaultConfig: undefined,
  };
}