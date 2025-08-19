# Plugin API Specification

## Version 1.0

This document defines the simple Plugin API for DungeonsOnAutomatic (DOA), enabling easy extensibility through community plugins with minimal friction.

## 1. Overview

The Plugin API extends DOA's modular architecture by allowing external plugins to:
- Add new system modules for different RPG systems
- Provide custom export formats beyond ASCII, SVG, JSON, and FoundryVTT
- Implement specialized room generation algorithms
- Extend encounter generation capabilities

### 1.1 Plugin Types (Flexible)

Plugins can be whatever you want them to be! Common examples:

- **System Plugins**: Add support for different RPG systems (D&D, Pathfinder, etc.)
- **Export Plugins**: Output dungeons in different formats (Roll20, Foundry, etc.)
- **Generator Plugins**: Alternative room or encounter generation
- **Utility Plugins**: Whatever creative idea you have!

No rigid categories - make what you want!

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

### 2.2 Simple Conventions

- Plugin directories: Whatever you want (e.g., `dnd5e`, `my-homebrew`, `cool-exporter`)
- Plugin IDs: Simple strings (e.g., `dnd5e`, `pathfinder`, `my-system`)
- Entry points: `index.js` or `index.ts` (or whatever you specify in package.json)
- Configuration: Optional `plugin.config.js` if you need it

## 3. Plugin Metadata (package.json)

### 3.1 Minimal Required Fields

```json
{
  "name": "my-dnd5e-plugin",
  "version": "1.0.0",
  "description": "D&D 5e system for DOA",
  "main": "index.js",
  "doaPlugin": {
    "id": "dnd5e"
  }
}
```

### 3.2 Optional Fields

```json
{
  "doaPlugin": {
    "id": "dnd5e",
    "version": "1.2.0",
    "description": "Comprehensive D&D 5e support",
    "author": "Your Name",
    "tags": ["dnd", "5e", "fantasy"]
  }
}
```

### 3.3 Simple Metadata Schema

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | Yes | string | Simple plugin identifier (e.g., "dnd5e") |
| `version` | No | string | Plugin version (defaults to "1.0.0") |
| `description` | No | string | Brief description |
| `author` | No | string | Author name |
| `tags` | No | string[] | Tags for discovery |

## 4. Plugin Types and Interfaces

### 4.1 System Plugins

System plugins add RPG system support. Just implement the essentials:

```typescript
interface SystemPlugin {
  metadata: PluginMetadata;
  
  // Core functionality
  id: string;
  label: string;
  enrich(dungeon: Dungeon, options?: SystemOptions): Promise<Dungeon> | Dungeon;
  
  // Optional helpers
  initialize?(config?: PluginConfig): Promise<void> | void;
  cleanup?(): Promise<void> | void;
  getDefaultConfig?(): PluginConfig;
}
```

### 4.2 Export Plugins

Export plugins convert dungeons to different formats:

```typescript
interface ExportPlugin {
  metadata: PluginMetadata;
  supportedFormats: string[]; // e.g., ['roll20', 'foundry']
  
  export(dungeon: Dungeon, format: string, options?: ExportOptions): 
    Promise<ExportResult> | ExportResult;
}

interface ExportResult {
  format: string;
  data: unknown; // Your format's data
  contentType?: string;
  filename?: string;
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
2. **Metadata Validation**: Plugin manifest is validated against schema
3. **Dependency Resolution**: Plugin dependencies are checked and resolved
4. **Loading**: Plugin code is loaded and instantiated
5. **Initialization**: Optional `initialize()` method is called
6. **Runtime Validation**: Optional `validate()` method is invoked
7. **Registration**: Plugin is registered with the appropriate service
8. **Execution**: Plugin's main methods (`enrich`, `export`, `generateRooms`) run during dungeon generation
9. **Cleanup**: Optional `cleanup()` method runs when the plugin is unloaded

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

### 10.1 Super Simple System Plugin

```typescript
// index.ts
import { SystemPlugin, Dungeon, Monster } from '@doa/core';

const mySystemPlugin: SystemPlugin = {
  id: 'my-rpg',
  label: 'My Custom RPG',
  
  metadata: {
    id: 'my-rpg',
    description: 'Adds goblins to dungeons',
    author: 'Me'
  },
  
  enrich(dungeon: Dungeon): Dungeon {
    // Add a goblin to each room - that's it!
    const encounters = { ...dungeon.encounters };
    
    for (const room of dungeon.rooms) {
      encounters[room.id] = {
        ...encounters[room.id],
        monsters: [{
          name: 'Goblin',
          cls: 'Monster',
          tags: ['goblin']
        }]
      };
    }
    
    return { ...dungeon, encounters };
  }
};

export default mySystemPlugin;
```

### 10.2 Simple Export Plugin

```typescript
// index.ts
import { ExportPlugin, Dungeon } from '@doa/core';

const myExporter: ExportPlugin = {
  metadata: {
    id: 'text-export',
    description: 'Export as simple text'
  },
  
  supportedFormats: ['txt'],
  
  export(dungeon: Dungeon): ExportResult {
    // Convert dungeon to text format
    const text = `Dungeon: ${dungeon.rooms.length} rooms\n` +
                dungeon.rooms.map(r => 
                  `Room ${r.id}: ${r.w}x${r.h}`
                ).join('\n');
    
    return {
      format: 'txt',
      data: text,
      filename: 'dungeon.txt'
    };
  }
};

export default myExporter;
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