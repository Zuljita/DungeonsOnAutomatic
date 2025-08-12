# DungeonsOnAutomatic Project Plan

## Vision
Build a sleek, extensible dungeon generation toolkit. The first release will showcase deep support for the **Dungeon Fantasy Roleplaying Game (DFRPG)**, while every part of the engine remains replaceable so other systems (D&D 5e, GURPS, Savage Worlds, etc.) can slot in later.

## Guiding Principles
- System-agnostic core that never assumes a rule set.
- Optional modules influence genre, rule system, and map style.
- Runs locally with minimal prerequisites.

## Phase 1 – Foundation
**Objective:** establish a clean TypeScript project.

**Tasks**
- Node.js LTS, TypeScript, ESLint, Prettier, Vitest.
- pnpm for dependency management.
- Project assets: `.gitignore`, `README.md`, `LICENSE`.
- Folder structure:
  ```
  src/
    core/      # system-agnostic logic
    systems/   # plug-ins (start with dfrpg)
    services/  # utilities: map drawing, proc-gen
    cli/       # command-line entry point
  tests/
  ```
- Define interfaces: `Room`, `Corridor`, `Monster`, `Trap`, `Treasure`, `Dungeon`.
- Define a `SystemModule` interface for plug-ins.
- Minimal CLI: `doa generate --rooms=10 --system=dfrpg` emits JSON.

## Phase 2 – Dungeon Layout
**Objective:** create valid dungeon maps.

**Tasks**
- Room generator (types, size, coordinates).
- Corridor generator (connect rooms using basic pathfinding).
- Dungeon assembler to merge rooms and corridors.
- Tests for non-overlap and total connectivity.

## Phase 3 – DFRPG System Module
**Objective:** provide a polished default implementation.

**Tasks**
- `systems/dfrpg` implements `SystemModule`.
- Populate rooms with monsters, traps, and treasure using DFRPG stats.
- Format stat blocks for table use.
- Include a generic fallback module for unsupported systems.

## Phase 4 – Output & Interface
**Objective:** make results easy to consume.

**Tasks**
- Export formats: JSON, SVG, Foundry VTT JSON, DonJon-style TSV.
- Map drawing service with room labels and entry markers.
- Web GUI for setting parameters and previewing ASCII map & JSON.

## Phase 5 – Extensibility & Polish
**Objective:** encourage community growth and system swaps.

**Tasks**
- Plugin API for new room generators, exporters, or full rule systems.
- Documentation: `project_config.md`, `workflow_state.md`, `CONTRIBUTING.md`.
- Examples with screenshots.
- Procedural name generator and AI-assisted descriptions.

## Stretch Ambitions
- Campaign generator linking multiple dungeons.
- Online marketplace for community modules.
- Advanced map styles (hex, gridless, hand-drawn).

---

