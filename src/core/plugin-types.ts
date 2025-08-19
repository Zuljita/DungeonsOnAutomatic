import { z } from 'zod';
import type { Dungeon, Room, Monster, Trap, Treasure, SystemModule, RNG, RoomShape } from './types';

// === Plugin Metadata ===

export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface PluginDependencies {
  core: string; // Semver range for DOA core
  systems?: string[]; // Required system plugin dependencies
  plugins?: string[]; // Other plugin dependencies
}

export interface PluginMetadata {
  id: string; // Unique plugin identifier (namespace.name)
  version: string; // Plugin version (semver)
  name?: string; // Human-readable name (fallback to id)
  description?: string; // Plugin description
  author: PluginAuthor; // Author information
  license?: string; // Plugin license
  compatibility: string; // DOA version compatibility (semver range)
  dependencies?: PluginDependencies; // Plugin dependencies
  tags?: string[]; // Searchable tags
  homepage?: string; // Plugin homepage URL
  repository?: string; // Source code repository URL
  bugs?: string; // Bug report URL
}

// === Validation Result ===

export interface ValidationIssue {
  level: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// === Plugin Configuration ===

export interface PluginConfig {
  [key: string]: unknown;
}

export interface CLIOption {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  choices?: string[];
  default?: unknown;
  required?: boolean;
  alias?: string;
}

export interface PluginConfigSchema {
  cliOptions?: CLIOption[];
  envVars?: Record<string, string>; // env var name -> config key mapping
  schema?: z.ZodSchema; // Zod validation schema
}

// === Base Plugin Interface ===

export interface BasePlugin {
  metadata: PluginMetadata;
  
  // Optional lifecycle hooks
  initialize?(config: PluginConfig): Promise<void> | void;
  cleanup?(): Promise<void> | void;
  
  // Configuration support
  getConfigSchema?(): PluginConfigSchema;
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

export interface SystemPlugin extends BasePlugin, SystemModule {
  // Enhanced metadata (already covered by BasePlugin)
  
  // Optional validation
  validate?(dungeon: Dungeon, options?: SystemOptions): ValidationResult;
  
  // Enhanced options support
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
    
  getExportSchema?(format: string): z.ZodSchema;
  validateExport?(result: ExportResult): ValidationResult;
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
  
  validateLayout?(rooms: Room[]): ValidationResult;
  getGenerationSchema?(): z.ZodSchema;
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
  
  getEncounterTypes(): string[];
  validateEncounter?(encounter: Encounter, context: EncounterContext): ValidationResult;
}

// === Plugin Registry Interfaces ===

export type PluginType = 'system' | 'export' | 'room-generator' | 'encounter';

export interface PluginInfo {
  metadata: PluginMetadata;
  type: PluginType;
  installed: boolean;
  enabled: boolean;
  loadPath?: string;
  source?: string; // Where it was installed from (GitHub URL, npm package, etc.)
  installDate?: Date;
}

export interface PluginQuery {
  type?: PluginType;
  tags?: string[];
  author?: string;
  search?: string; // Text search in name/description
  sortBy?: 'name' | 'installed' | 'updated';
  limit?: number;
  offset?: number;
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

// === Plugin Zod Schemas ===

export const PluginAuthorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  url: z.string().url().optional(),
});

export const PluginDependenciesSchema = z.object({
  core: z.string().min(1), // Should validate semver format
  systems: z.array(z.string()).optional(),
  plugins: z.array(z.string()).optional(),
});

export const PluginMetadataSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+$/), // namespace.name format
  version: z.string().regex(/^\d+\.\d+\.\d+/), // Basic semver validation
  name: z.string().optional(),
  description: z.string().optional(),
  author: PluginAuthorSchema,
  license: z.string().optional(),
  compatibility: z.string().min(1),
  dependencies: PluginDependenciesSchema.optional(),
  tags: z.array(z.string()).optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  bugs: z.string().url().optional(),
});

export const CLIOptionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array']),
  description: z.string().min(1),
  choices: z.array(z.string()).optional(),
  default: z.unknown().optional(),
  required: z.boolean().optional(),
  alias: z.string().optional(),
});

export const PluginConfigSchemaSchema = z.object({
  cliOptions: z.array(CLIOptionSchema).optional(),
  envVars: z.record(z.string()).optional(),
  schema: z.unknown().optional(), // Can't validate ZodSchema directly
});

export const ValidationIssueSchema = z.object({
  level: z.enum(['error', 'warning', 'info']),
  code: z.string(),
  message: z.string(),
  context: z.record(z.unknown()).optional(),
});

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  issues: z.array(ValidationIssueSchema),
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

export function isEncounterPlugin(plugin: BasePlugin): plugin is EncounterPlugin {
  return 'generateEncounter' in plugin && 'getEncounterTypes' in plugin;
}

// === Utility Functions ===

export function validatePluginMetadata(metadata: unknown): PluginMetadata {
  return PluginMetadataSchema.parse(metadata);
}

export function createValidationResult(
  valid: boolean = true, 
  issues: ValidationIssue[] = []
): ValidationResult {
  return { valid, issues };
}

export function addValidationIssue(
  result: ValidationResult, 
  level: ValidationIssue['level'],
  code: string,
  message: string,
  context?: Record<string, unknown>
): ValidationResult {
  result.issues.push({ level, code, message, context });
  if (level === 'error') {
    result.valid = false;
  }
  return result;
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
    id: `legacy.${module.id}`,
    version: '1.0.0',
    author: { name: 'Legacy Module' },
    license: 'Unknown',
    compatibility: '^1.0.0',
    dependencies: { core: '^1.0.0' },
    description: `Legacy system module: ${module.label}`,
    ...metadata
  };

  return {
    ...module,
    metadata: defaultMetadata,
    
    // Optional enhanced methods with defaults
    initialize: undefined,
    cleanup: undefined,
    validate: undefined,
    getConfigSchema: undefined,
    getDefaultConfig: undefined,
  };
}