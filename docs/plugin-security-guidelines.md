# Plugin Safety Guidelines

## Version 1.0

This document outlines practical safety considerations and best practices for DOA plugin development and usage.

## Reality Check: What We're Actually Protecting

DOA is a **local hobbyist tool** for generating fantasy dungeons. The realistic concerns are:

- **Accidental infinite loops**: User can kill the process
- **Plugin crashes**: User restarts DOA
- **Bad file operations**: Operating system permissions handle this
- **Dependency conflicts**: Standard npm/node issues

**Not realistic concerns for this use case:**
- Malicious actors targeting DOA users
- Corporate espionage via dungeon plugins
- Large-scale supply chain attacks
- Compliance or regulatory requirements

## Practical Safety Approach

### Plugin Isolation

Keep it simple - just prevent plugins from doing obviously problematic things:

```typescript
// Basic isolation - prevent dangerous Node.js APIs
const blockedAPIs = [
  'child_process',  // No spawning other processes
  'cluster',        // No process clustering
  'worker_threads'  // No worker threads
];

// Everything else is fair game for a local tool
```

### Error Handling

Focus on graceful degradation:

```typescript
async function loadPlugin(path: string): Promise<Plugin | null> {
  try {
    const plugin = await import(path);
    return plugin;
  } catch (error) {
    console.error(`Plugin failed to load: ${path}`);
    console.error(error.message);
    return null; // Continue without this plugin
  }
}
```

### Source Tracking

Just track where plugins came from for easy removal:

```json
{
  "installedPlugins": {
    "community.dnd5e": {
      "source": "https://github.com/user/dnd5e-plugin",
      "installDate": "2024-01-15T10:30:00Z",
      "version": "1.2.0"
    }
  }
}
```

## Best Practices for Plugin Developers

### Write Robust Code

```typescript
// DO: Handle errors gracefully
function generateMonster(options: MonsterOptions): Monster | null {
  try {
    if (!options.level || options.level < 1) {
      console.warn('Invalid monster level, using default');
      options.level = 1;
    }
    return createMonster(options);
  } catch (error) {
    console.error('Monster generation failed:', error.message);
    return null; // Let the system continue
  }
}

// DON'T: Let errors crash everything
function generateMonster(options: any): Monster {
  return createMonster(options); // What if options is null?
}
```

### Validate Inputs

```typescript
// Use Zod or similar for input validation
const MonsterOptionsSchema = z.object({
  level: z.number().min(1).max(20),
  type: z.enum(['humanoid', 'undead', 'dragon']),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional()
});

function generateMonster(options: unknown): Monster | null {
  const parsed = MonsterOptionsSchema.safeParse(options);
  if (!parsed.success) {
    console.warn('Invalid monster options:', parsed.error.message);
    return null;
  }
  
  return createMonster(parsed.data);
}
```

### Be a Good Citizen

```typescript
// DO: Clean up after yourself
class MySystemPlugin {
  private cache = new Map();
  
  cleanup() {
    this.cache.clear();
    // Clean up any timers, file handles, etc.
  }
}

// DO: Provide helpful error messages
throw new Error('Unable to load monster data: monsters.json not found in plugin directory');

// DON'T: Expose internal details that don't help users
throw new Error('Database connection failed at line 247 in internal module');
```

### Dependencies

```json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "zod": "^3.20.0"
  }
}
```

Stick to well-maintained, popular packages. Avoid:
- Packages with known security issues
- Abandoned packages (no updates in 2+ years)
- Packages that seem unnecessarily complex for simple tasks

## Installation Safety

### Trust Your Sources

```bash
# GitHub repos you can inspect
doa plugin install https://github.com/trusted-user/plugin

# Published npm packages
doa plugin install @doa-plugins/pathfinder

# Local development
doa plugin install ./my-plugin/
```

If you don't trust the source, don't install it. It's that simple.

### Easy Removal

```bash
# Remove plugins that cause problems
doa plugin remove community.dnd5e
doa plugin list  # See what's installed
```

## When Things Go Wrong

### Plugin Won't Load
- Check the error message
- Verify the plugin is compatible with your DOA version
- Try reinstalling: `doa plugin remove X && doa plugin install X`

### Plugin Crashes DOA
- Remove the problematic plugin
- Report the issue to the plugin author
- Check DOA logs for details

### Performance Issues
- Some plugins might be slow with large dungeons
- Kill the process if it hangs
- Consider simpler plugins or smaller dungeons

## For DOA Maintainers

Keep the plugin system simple:

1. **Basic validation** of plugin structure
2. **Error isolation** so bad plugins don't crash DOA  
3. **Clear error messages** to help users debug
4. **Easy installation/removal** workflow

Don't over-engineer security for a hobbyist tool. The main goal is **not breaking the user experience**, not protecting against sophisticated attacks.

## Summary

The DOA plugin system should be **simple, practical, and user-friendly**. Focus on:

- ✅ **Preventing accidents** (infinite loops, crashes)
- ✅ **Clear error messages** when things go wrong
- ✅ **Easy plugin management** (install/remove)
- ❌ ~~Enterprise security theater~~
- ❌ ~~Complex permission systems~~
- ❌ ~~Artificial resource limits~~

**Remember**: We're generating fantasy dungeons for fun, not running a bank. Keep it simple!