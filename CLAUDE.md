# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Main commands:**
- `pnpm install` - Install dependencies
- `pnpm build` - Build TypeScript to dist/
- `pnpm dev` or `pnpm doa` - Run CLI in development mode with tsx
- `pnpm test` - Run test suite with vitest
- `pnpm lint` - Lint TypeScript files with ESLint
- `pnpm format` - Format code with Prettier

**GUI commands:**
- `pnpm gui` - Start GUI development server with HMR
- `pnpm gui:build` - Build GUI for production
- `pnpm gui:preview` - Preview built GUI on port 3000

**Testing commands:**
- `pnpm test` - Run unit tests with vitest
- `pnpm test:e2e` - Run browser tests with Playwright (headless)
- `pnpm test:e2e:headed` - Run browser tests with visible browser (debugging)
- `pnpm test:e2e:ui` - Interactive Playwright test runner

**CLI usage examples:**
```bash
pnpm doa generate --rooms=10 --system=dfrpg
pnpm doa generate --rooms=20 --svg > map.svg
pnpm doa generate --rooms=15 --foundry > foundry.json
pnpm doa generate --rooms=8 --ascii
```

## Architecture Overview

**DungeonsOnAutomatic (DOA)** is a modular dungeon generation tool with a system-agnostic core and pluggable system modules.

**Core Architecture:**
- `/src/core/types.ts` - Central type definitions for Dungeon, Room, Corridor, Door, Monster, Trap, Treasure, SystemModule
- `/src/services/` - System-agnostic utilities (assembler, rooms, corridors, doors, pathfinder, render, foundry export)
- `/src/systems/` - System-specific modules (dfrpg, generic)
- `/src/cli/` - Command-line interface using Commander.js
- `/apps/gui/` - Separate Vite-based web GUI workspace

**Key Flow:**
1. `buildDungeon()` in assembler.ts generates base layout (rooms, corridors, doors)
2. System modules enrich dungeons with encounters via the `SystemModule.enrich()` interface
3. Output plugins render to ASCII, SVG, JSON, or FoundryVTT format via plugin system

**System Module Pattern:**
System modules implement the `SystemModule` interface with `id`, `label`, and `enrich()` method. The DFRPG module adds monsters, traps, and treasure to rooms using GURPS Dungeon Fantasy data.

**Workspace Structure:**
This is a pnpm workspace with the main package and GUI as separate workspaces. The GUI is a minimal Vite TypeScript app that imports from the main package.

**Key Services:**
- `assembler.ts` - Main dungeon builder orchestrating room generation, corridor connection, door placement
- `system-loader.ts` - Dynamic loading of system modules with fallback to generic
- `render.ts` - ASCII map rendering (SVG moved to plugin)
- `foundry.ts` - FoundryVTT export format
- `key-items.ts` & `room-key.ts` - Key/lock system for door access control

## Plugin System Architecture

**Plugin Types:**
- **Export Plugins** - ASCII, SVG, FoundryVTT export formats (`src/plugins/ascii-export/`, `src/plugins/svg-export/`)
- **Room Shape Plugins** - Generate 8 room shapes (rectangular, circular, hexagonal, etc.)
- **System Plugins** - Game system-specific enrichment (DFRPG, generic)

**Core Export Plugins:**
- `svg-export` - SVG rendering with theme support (light, dark, sepia), custom themes, hex style, shape-aware door rendering
- `ascii-export` - ASCII text rendering for terminal output
- Third-party plugins for PDF, Roll20, Foundry formats

**Plugin Loading:**
- **Node.js CLI**: Full plugin system with dynamic imports and sandbox security
- **Browser GUI**: Built-in algorithms with environment detection
- **Discovery**: Scans `src/plugins/`, `dist/plugins/`, `plugins/`, `node_modules/`
- **Security**: Validates plugin capabilities and sandboxes untrusted code

## Browser Testing & Compatibility Guidelines

**CRITICAL: Browser issues are a known blind spot for Claude Code. Always use Playwright testing for browser-related changes.**

### When to use browser testing:
- ANY changes to GUI code or services used by the GUI
- Plugin system modifications (browser vs Node.js compatibility)
- Adding new browser-dependent features
- Fixing race conditions or async initialization issues

### Browser testing commands:
- `pnpm test:e2e` - Run full browser test suite (USE THIS FOR GUI CHANGES)
- `pnpm test:e2e:headed` - Debug tests with visible browser
- `pnpm test:e2e:ui` - Interactive test development

### Common browser compatibility issues to watch for:
1. **Node.js modules in browser**: Cannot use `node:fs`, `node:path`, etc. in browser code
2. **Dynamic imports**: Vite cannot analyze dynamic imports with variables
3. **Race conditions**: Async plugin loading vs synchronous GUI calls
4. **Console errors**: JavaScript errors that don't appear in CLI testing

### Plugin system browser compatibility:
- **Node.js Environment**: Uses full plugin loading with sandbox security
- **Browser Environment**: Uses built-in algorithms with environment detection
- **Key pattern**: `const isBrowser = typeof window !== 'undefined'`
- **Dynamic imports**: Conditional `await import()` only in Node.js environment

### Room Shape Service Architecture:
- Browser: Built-in shape algorithms (no plugin loading)
- Node.js: Plugin-based shape loading with fallbacks
- Race condition fix: GUI calls `await roomShapeService.initialize()` before generation

**ALWAYS run browser tests after:**
- Modifying services used by GUI
- Changing plugin loading logic
- Adding new GUI features
- Fixing async/await patterns

## Development Best Practices

### Library-First Development Philosophy

**ALWAYS prefer existing, well-maintained libraries over custom implementations:**

1. **Search existing ecosystem first**: Before writing custom algorithms or utilities, search for established libraries that solve the same problem
2. **Check package.json dependencies**: Review existing dependencies to see if functionality is already available
3. **Evaluate library maturity**: Prefer libraries with active maintenance, good documentation, and TypeScript support
4. **Consider bundle size**: For browser-facing features, evaluate the impact on bundle size

**Examples from this project:**
- ✅ **PathFinding.js** - Used for corridor pathfinding instead of custom A* implementation
- ✅ **panzoom.js** - Used for interactive map navigation instead of custom pan/zoom logic
- ✅ **Commander.js** - Used for CLI parsing instead of manual argument processing
- ❌ **Custom ASCII rendering** - Justified because it's core domain logic specific to dungeon generation

**When custom code is appropriate:**
- Core domain logic unique to dungeon generation (room placement, corridor generation)
- Integration glue between libraries
- Performance-critical algorithms where libraries don't meet specific needs
- When existing libraries don't support required features and can't be easily extended

**Before implementing custom solutions, ask:**
1. "Does an npm package already solve this problem?"
2. "Can existing project dependencies be extended to handle this use case?"
3. "Is this core domain logic that justifies custom implementation?"
4. "Would using a library significantly improve maintainability and reduce bugs?"

### Code Duplication Prevention

**ALWAYS eliminate duplicate code patterns by creating reusable utilities:**

1. **Identify duplication early**: When you see similar code in 2+ locations, consolidate it immediately
2. **Create utility modules**: Place reusable functions in `/src/utils/` with clear, descriptive names
3. **Look for common patterns**: Grid operations, data transformations, validation logic, algorithm implementations
4. **Maintain single source of truth**: Each piece of logic should exist in exactly one place

**Utility Organization:**
- `/src/utils/grid-utils.ts` - Grid bounds calculation, creation, coordinate transformation
- `/src/utils/room-utils.ts` - Room shape checking, border detection, point operations  
- `/src/utils/union-find.ts` - Disjoint set operations for graph algorithms
- Add new utilities as patterns emerge

**Examples of successfully consolidated patterns:**
- ✅ **Grid bounds calculation** - Eliminated from 7+ files using `calculateGridBounds()`
- ✅ **Room shape checking** - Eliminated from 15+ files using `isRectangularRoom()`
- ✅ **Union-Find algorithm** - Eliminated from 4+ files using `createSimpleUnionFind()`
- ✅ **Grid creation** - Eliminated from 5+ files using `createGrid()`

**Before writing new code, check:**
1. "Does this logic already exist somewhere in the codebase?"
2. "Could this pattern be useful in other parts of the system?"
3. "Is this similar enough to existing code that it should be consolidated?"
4. "Would extracting this to a utility improve testability and maintainability?"

**Red flags indicating duplication:**
- Copy-pasting code blocks between files
- Similar function names with slight variations (`connectRooms` vs `connectRoomsEnhanced`)
- Repeated patterns in loops, conditionals, or data processing
- Multiple implementations of the same algorithm or data structure
# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

**BROWSER TESTING MANDATE**: For any GUI-related changes, ALWAYS run `pnpm test:e2e` to catch browser compatibility issues. Browser problems are a known blind spot - the tests will catch what manual inspection cannot.