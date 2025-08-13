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