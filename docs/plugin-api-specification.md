# Plugin API Specification

## Version 1.0

This document defines the Plugin API for DungeonsOnAutomatic (DOA), enabling extensibility through third-party plugins while maintaining system integrity and security.

## 1. Overview

The Plugin API extends DOA's modular architecture by allowing external plugins to:
- Add new system modules for different RPG systems
- Provide custom export formats beyond ASCII, SVG, JSON, and FoundryVTT
- Implement specialized room generation algorithms
- Extend encounter generation capabilities

### 1.1 Plugin Types

| Plugin Type | Purpose | Interface |
|-------------|---------|-----------|
| **System Module** | RPG system-specific content generation | `SystemPlugin` |
| **Export Format** | Custom output formats for generated dungeons | `ExportPlugin` |
| **Room Generator** | Alternative room placement and generation algorithms | `RoomGeneratorPlugin` |
| **Encounter Generator** | Custom encounter generation logic | `EncounterPlugin` |

## 2. Plugin Directory Structure

### 2.1 Plugin Package Structure

```
plugins/
├── my-system-plugin/
│   ├── package.json           # Plugin metadata
│   ├── index.js              # Main entry point
│   ├── plugin.config.js      # Plugin configuration
│   ├── data/                 # Plugin data files
│   │   ├── monsters.json
│   │   ├── traps.json
│   │   └── treasure.json
│   └── README.md            # Plugin documentation
└── my-export-plugin/
    ├── package.json
    ├── index.js
    └── plugin.config.js
```

### 2.2 Naming Conventions

- Plugin directories: `kebab-case` (e.g., `dnd5e-system`, `roll20-export`)
- Plugin IDs: `kebab-case` with namespace prefix (e.g., `community.dnd5e`, `official.pathfinder`)
- Entry points: Always `index.js` or `index.ts`
- Configuration: Always `plugin.config.js`

## 3. Plugin Metadata (package.json)

### 3.1 Required Fields

```json
{
  "name": "@doa-plugins/my-system",
  "version": "1.0.0",
  "description": "D&D 5e system plugin for DOA",
  "main": "index.js",
  "doaPlugin": {
    "id": "community.dnd5e",
    "type": "system",
    "compatibility": "^1.0.0",
    "author": {
      "name": "Plugin Author",
      "email": "author@example.com",
      "url": "https://example.com"
    },
    "dependencies": {
      "core": "^1.0.0",
      "systems": []
    },
    "tags": ["dnd", "5e", "fantasy", "official"],
    "license": "MIT"
  }
}
```

### 3.2 Plugin Metadata Schema

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | Yes | string | Unique plugin identifier (namespace.name) |
| `type` | Yes | string | Plugin type: `system`, `export`, `room-generator`, `encounter` |
| `compatibility` | Yes | string | Semver range for DOA compatibility |
| `author` | Yes | object | Author information |
| `dependencies.core` | Yes | string | Required DOA core version |
| `dependencies.systems` | No | string[] | Required system plugin dependencies |
| `tags` | No | string[] | Searchable tags for plugin discovery |
| `license` | Yes | string | Plugin license (must be compatible with DOA) |

## 4. Plugin Types and Interfaces

### 4.1 System Plugins

System plugins extend the existing `SystemModule` interface with enhanced metadata:

```typescript
interface SystemPlugin extends SystemModule {
  // Core SystemModule interface
  id: string;
  label: string;
  enrich(dungeon: Dungeon, options?: SystemOptions): Promise<Dungeon> | Dungeon;
  
  // Enhanced plugin metadata
  metadata: PluginMetadata;
  
  // Optional lifecycle hooks
  initialize?(config: PluginConfig): Promise<void> | void;
  validate?(dungeon: Dungeon): ValidationResult;
  cleanup?(): Promise<void> | void;
  
  // Configuration support
  getConfigSchema?(): JSONSchema;
  getDefaultConfig?(): Record<string, unknown>;
}
```

### 4.2 Export Plugins

Export plugins provide custom output formats:

```typescript
interface ExportPlugin {
  metadata: PluginMetadata;
  supportedFormats: string[]; // e.g., ['roll20', 'foundry-v11']
  
  export(dungeon: Dungeon, format: string, options?: ExportOptions): 
    Promise<ExportResult> | ExportResult;
    
  getExportSchema?(format: string): JSONSchema;
  validateExport?(result: ExportResult): ValidationResult;
}

interface ExportResult {
  format: string;
  data: unknown; // Format-specific data
  contentType?: string;
  filename?: string;
  metadata?: Record<string, unknown>;
}
```

### 4.3 Room Generator Plugins

Room generator plugins provide alternative room placement algorithms:

```typescript
interface RoomGeneratorPlugin {
  metadata: PluginMetadata;
  
  generateRooms(
    config: RoomGenerationConfig, 
    rng: RNG
  ): Promise<Room[]> | Room[];
  
  validateLayout?(rooms: Room[]): ValidationResult;
  getConfigSchema?(): JSONSchema;
}

interface RoomGenerationConfig {
  roomCount: number;
  minRoomSize: number;
  maxRoomSize: number;
  allowOverlap: boolean;
  preferredShapes?: RoomShape[];
  customConstraints?: Record<string, unknown>;
}
```

### 4.4 Encounter Plugins

Encounter plugins provide specialized encounter generation:

```typescript
interface EncounterPlugin {
  metadata: PluginMetadata;
  
  generateEncounter(
    room: Room,
    context: EncounterContext,
    options?: EncounterOptions
  ): Promise<Encounter> | Encounter;
  
  getEncounterTypes(): string[];
  validateEncounter?(encounter: Encounter): ValidationResult;
}

interface EncounterContext {
  dungeonLevel: number;
  roomType: Room['kind'];
  adjacentRooms: Room[];
  partyLevel?: number;
  systemId: string;
}

interface Encounter {
  monsters?: Monster[];
  traps?: Trap[];
  treasure?: Treasure[];
  environmental?: EnvironmentalHazard[];
  metadata?: Record<string, unknown>;
}
```

## 5. Plugin Lifecycle

### 5.1 Loading Sequence

1. **Discovery**: DOA scans plugin directories for `package.json` files
2. **Validation**: Plugin metadata is validated against schema
3. **Dependency Resolution**: Plugin dependencies are checked and resolved
4. **Loading**: Plugin code is loaded and instantiated
5. **Initialization**: Optional `initialize()` method is called
6. **Registration**: Plugin is registered with the appropriate service

### 5.2 Error Handling

- **Load Errors**: Plugins that fail to load are logged and skipped
- **Runtime Errors**: Plugin errors are caught and logged, with fallback to defaults
- **Validation Errors**: Invalid plugin configurations are rejected at load time

## 6. Configuration System

### 6.1 Plugin Configuration File

```javascript
// plugin.config.js
export default {
  // Plugin-specific options
  enableAdvancedFeatures: true,
  defaultDifficulty: 'moderate',
  
  // CLI integration
  cliOptions: [
    {
      name: 'difficulty',
      type: 'string',
      description: 'Encounter difficulty level',
      choices: ['easy', 'moderate', 'hard'],
      default: 'moderate'
    },
    {
      name: 'enable-advanced',
      type: 'boolean',
      description: 'Enable advanced features',
      default: true
    }
  ],
  
  // Environment variables
  envVars: {
    'DOA_PLUGIN_DIFFICULTY': 'difficulty',
    'DOA_PLUGIN_ADVANCED': 'enable-advanced'
  }
};
```

### 6.2 CLI Integration

Plugins can register CLI options that appear when the plugin is active:

```bash
# System plugin options
pnpm doa generate --system=community.dnd5e --difficulty=hard --enable-advanced

# Export plugin options  
pnpm doa generate --export=community.roll20 --include-lighting --grid-size=70
```

### 6.3 Configuration Priority

1. CLI arguments (highest priority)
2. Environment variables
3. Plugin configuration file
4. Plugin defaults
5. System defaults (lowest priority)

## 7. Plugin Loading and Safety

### 7.1 Basic Safety Requirements

- **Error Isolation**: Plugin crashes shouldn't break DOA
- **Source Attribution**: Track where plugins came from for easy removal
- **Graceful Failures**: Plugin errors should be logged and handled cleanly
- **Simple Installation**: Easy install/uninstall process

### 7.2 Plugin Environment

```typescript
interface PluginEnvironment {
  // DOA APIs
  core: {
    types: typeof import('../core/types');
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
```

### 7.3 Simple Loading

```typescript
async function loadPlugin(pluginPath: string): Promise<Plugin> {
  try {
    // Basic validation
    const metadata = await validatePluginMetadata(pluginPath);
    
    // Load and instantiate
    const plugin = await import(pluginPath);
    
    // Initialize if needed
    if (plugin.initialize) {
      await plugin.initialize();
    }
    
    return plugin;
  } catch (error) {
    console.error(`Failed to load plugin ${pluginPath}:`, error.message);
    throw error;
  }
}
```

## 8. Version Compatibility

### 8.1 Simple Versioning

- **MAJOR**: Breaking changes to plugin API
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### 8.2 Compatibility

Plugins specify their DOA compatibility in package.json:
```json
{
  "doaPlugin": {
    "compatibility": "^1.0.0"
  }
}
```

DOA will warn about version mismatches but still attempt to load plugins.

## 9. Plugin Distribution

### 9.1 Simple Distribution

No centralized registry needed - plugins can be distributed via:
- **GitHub repositories** (most common for open source)
- **npm packages** (for published plugins)
- **Local directories** (for development)
- **Direct URLs** (for quick sharing)

Users discover plugins through:
- Community recommendations
- GitHub topics/tags
- DOA documentation examples

### 9.2 Plugin Installation

```bash
# Install from GitHub
pnpm doa plugin install https://github.com/user/dnd5e-plugin

# Install from local directory
pnpm doa plugin install ./my-plugin/

# Install from npm
pnpm doa plugin install @doa-plugins/pathfinder

# List installed plugins
pnpm doa plugin list

# Remove plugin
pnpm doa plugin remove community.dnd5e
```

## 10. Examples

### 10.1 Simple System Plugin

```typescript
// index.ts
import { SystemPlugin, Dungeon, Monster } from '@doa/core';

const mySystemPlugin: SystemPlugin = {
  id: 'community.mysystem',
  label: 'My RPG System',
  
  metadata: {
    version: '1.0.0',
    author: 'Plugin Developer',
    description: 'Custom RPG system support'
  },
  
  async enrich(dungeon: Dungeon, options?: SystemOptions): Promise<Dungeon> {
    const encounters = { ...dungeon.encounters };
    
    // Custom monster generation logic
    for (const room of dungeon.rooms) {
      if (Math.random() < 0.4) {
        const monster: Monster = {
          name: 'Custom Beast',
          cls: 'Monster',
          tags: ['custom', 'beast']
        };
        
        encounters[room.id] = {
          ...encounters[room.id],
          monsters: [monster]
        };
      }
    }
    
    return { ...dungeon, encounters };
  }
};

export default mySystemPlugin;
```

### 10.2 Export Plugin Example

```typescript
// export-plugin.ts
import { ExportPlugin, Dungeon } from '@doa/core';

const rollTwentyExport: ExportPlugin = {
  metadata: {
    id: 'community.roll20',
    version: '1.0.0'
  },
  
  supportedFormats: ['roll20-json'],
  
  export(dungeon: Dungeon, format: string): ExportResult {
    if (format !== 'roll20-json') {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    const roll20Data = {
      name: `Generated Dungeon`,
      walls: generateWalls(dungeon),
      lights: generateLighting(dungeon),
      tokens: generateTokens(dungeon)
    };
    
    return {
      format,
      data: roll20Data,
      contentType: 'application/json',
      filename: `dungeon-${dungeon.seed}.json`
    };
  }
};

export default rollTwentyExport;
```

## 10. Future Considerations

### 10.1 Potential Enhancements

- **Hot Reloading**: Reload plugins during development without restarting
- **Plugin Templates**: Simple scaffolding for common plugin types
- **Better Error Messages**: More helpful debugging information
- **Plugin Dependencies**: Allow plugins to depend on other plugins

### 10.2 Community Growth

- **Example Gallery**: Showcase interesting community plugins
- **Documentation**: More tutorials and guides
- **Integration Examples**: Show how to work with popular RPG systems