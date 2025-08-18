# Plugin Configuration Schema

## Version 1.0

This document defines the configuration system for DOA plugins, including CLI integration, environment variable support, and configuration file formats.

## Configuration Sources

Plugins can receive configuration from multiple sources, with the following priority order (highest to lowest):

1. **CLI Arguments** (--plugin-option=value)
2. **Environment Variables** (DOA_PLUGIN_OPTION=value)
3. **Plugin Configuration File** (plugin.config.js)
4. **Plugin Defaults** (getDefaultConfig() method)
5. **System Defaults**

### Conflict Resolution

When the same option appears in multiple sources, the value from the highest-priority source overrides lower-priority values. Primitive values are replaced, while object values are shallow-merged.

## Plugin Configuration File

### Basic Structure

```javascript
// plugin.config.js
export default {
  // Plugin-specific configuration
  enableAdvancedFeatures: true,
  defaultDifficulty: 'moderate',
  maxEncounters: 5,
  
  // CLI integration options
  cliOptions: [
    {
      name: 'difficulty',
      type: 'string',
      description: 'Set encounter difficulty level',
      choices: ['easy', 'moderate', 'hard', 'extreme'],
      default: 'moderate',
      alias: 'd'
    },
    {
      name: 'max-encounters',
      type: 'number', 
      description: 'Maximum number of encounters per room',
      default: 3,
      required: false
    },
    {
      name: 'enable-advanced',
      type: 'boolean',
      description: 'Enable advanced plugin features',
      default: true
    },
    {
      name: 'tags',
      type: 'array',
      description: 'Monster tags to include',
      default: ['undead', 'goblin']
    }
  ],
  
  // Environment variable mappings
  envVars: {
    'DOA_PLUGIN_DIFFICULTY': 'difficulty',
    'DOA_PLUGIN_MAX_ENCOUNTERS': 'max-encounters',
    'DOA_PLUGIN_ADVANCED': 'enable-advanced',
    'DOA_PLUGIN_TAGS': 'tags'
  },
  
  // Validation schema (optional)
  validation: {
    difficulty: ['easy', 'moderate', 'hard', 'extreme'],
    maxEncounters: { min: 1, max: 10 },
    enableAdvanced: 'boolean'
  }
};
```

## CLI Option Types

### String Options
```javascript
{
  name: 'system-variant',
  type: 'string',
  description: 'Choose system variant',
  choices: ['standard', 'homebrew', 'expanded'],
  default: 'standard',
  alias: 'v'
}
```

### Number Options  
```javascript
{
  name: 'encounter-level',
  type: 'number',
  description: 'Set encounter level (1-20)',
  default: 1,
  validation: { min: 1, max: 20 }
}
```

### Boolean Options
```javascript
{
  name: 'include-traps',
  type: 'boolean', 
  description: 'Include traps in encounters',
  default: true
}
```

### Array Options
```javascript
{
  name: 'monster-types',
  type: 'array',
  description: 'Monster types to include',
  default: ['humanoid', 'undead'],
  choices: ['humanoid', 'undead', 'dragon', 'elemental']
}
```

## Environment Variable Integration

Environment variables follow the pattern: `DOA_PLUGIN_{OPTION_NAME}`

- Use uppercase and underscores
- Prefix with `DOA_PLUGIN_`  
- Convert kebab-case to SNAKE_CASE

Examples:
- `--max-encounters` → `DOA_PLUGIN_MAX_ENCOUNTERS`
- `--enable-advanced` → `DOA_PLUGIN_ENABLE_ADVANCED`
- `--system-variant` → `DOA_PLUGIN_SYSTEM_VARIANT`

## Configuration Validation

Simple validation can be defined directly in CLI options:

```javascript
{
  name: 'difficulty-level',
  type: 'number',
  description: 'Set difficulty level', 
  validation: {
    min: 1,
    max: 10,
    integer: true
  },
  default: 5
}
```

For complex validation, use Zod schemas:

```typescript
import { z } from 'zod';

const PluginConfigSchema = z.object({
  difficulty: z.enum(['easy', 'moderate', 'hard']),
  level: z.number().int().min(1).max(20),
  features: z.object({
    traps: z.boolean(),
    treasure: z.boolean(),
    wanderingMonsters: z.boolean()
  }).optional()
});
```