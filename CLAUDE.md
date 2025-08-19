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
3. Output services render to ASCII, SVG, JSON, or FoundryVTT format

**System Module Pattern:**
System modules implement the `SystemModule` interface with `id`, `label`, and `enrich()` method. The DFRPG module adds monsters, traps, and treasure to rooms using GURPS Dungeon Fantasy data.

**Workspace Structure:**
This is a pnpm workspace with the main package and GUI as separate workspaces. The GUI is a minimal Vite TypeScript app that imports from the main package.

**Key Services:**
- `assembler.ts` - Main dungeon builder orchestrating room generation, corridor connection, door placement
- `system-loader.ts` - Dynamic loading of system modules with fallback to generic
- `render.ts` - ASCII and SVG map rendering
- `foundry.ts` - FoundryVTT export format
- `key-items.ts` & `room-key.ts` - Key/lock system for door access control

## Plugin System Architecture

**Plugin Types:**
- **Export Plugins** - ASCII, SVG, FoundryVTT export formats (`src/plugins/ascii-export/`)
- **Room Shape Plugins** - Generate 8 room shapes (rectangular, circular, hexagonal, etc.)
- **System Plugins** - Game system-specific enrichment (DFRPG, generic)

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

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

**BROWSER TESTING MANDATE**: For any GUI-related changes, ALWAYS run `pnpm test:e2e` to catch browser compatibility issues. Browser problems are a known blind spot - the tests will catch what manual inspection cannot.