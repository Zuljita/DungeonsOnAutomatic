Project Plan: DungeonsOnAutomatic
Goal:
Create a modular dungeon generation tool that can be run locally with minimal prerequisites, producing maps and associated game content in a system-agnostic way, with optional system modules (DFRPG, D&D, etc.). Make sure we leave room for modules that impact genre (eg. Fantasy, Sci-Fi, Horror), System (e.g. D&D 5e, GURPS, Savage Worlds), and map styles (hexes, squares, gridless, hatch).

Phase 1 – Foundation
Objective: Set up a clean, minimal Node.js TypeScript project and get the core structure right.

Dev Environment

Node.js LTS (latest stable).

TypeScript, ESLint, Prettier for code consistency.

Vitest/Jest for testing.

pnpm or npm as package manager.

.gitignore, README.md, and MIT license from day one.

Folder Structure

bash
Copy
Edit
/src
  /core         → core logic, system-agnostic
  /systems      → system-specific modules
  /services     → utilities (map drawing, procedural gen)
  /cli          → command-line entry point
/tests
Core Interfaces

Define TypeScript interfaces for:

Room

Corridor

Monster

Trap

Treasure

Dungeon

Define SystemModule interface (your YAML/TS snippet).

MVP CLI

Command: doa generate --rooms=10 --system=dfrpg

Outputs JSON to stdout.

Phase 2 – Room & Corridor Services
Objective: Make a minimal generator that outputs a valid dungeon layout.

Room Generator

Generates rooms with type, size, and coordinates.

Types: keep generic (chamber, hall, cavern, etc.).

Corridor Generator

Connects rooms with corridors using simple pathfinding.

Outputs connectivity graph.

Dungeon Assembler

Takes generated rooms + corridors.

Produces a single Dungeon object.

Tests

Validate no overlapping rooms.

Validate all rooms are connected.

Phase 3 – System Modules
Objective: Plug in rules/content for specific systems.

System Module Loader

Dynamically load from /systems.

Example: systems/dfrpg/index.ts implements SystemModule.

DFRPG Module Example

Generates monsters, traps, treasure per room.

Formats statblocks.

Generic/Fallback Module

Always available if no specific system is chosen.

Phase 4 – Output & Export
Objective: Give users useful outputs beyond JSON.

Export Formats

JSON (core data).

SVG (simple map drawing).

FoundryVTT-compatible JSON.
DonJon style TSV for importing to dungeon scrawl and dungeon painter studio

Map Drawing Service

Uses canvas or svg.js to produce maps.

Supports labels (room numbers, entrances, exits).

Phase 5 – Extensibility & Polish
Objective: Make it maintainable and easy to extend.

Plugin API

Allow new room generators, systems, or exporters to be added without touching core.

Documentation

project_config.md – architecture overview.

workflow_state.md – current development status.

CONTRIBUTING.md for community input.

Examples

Sample dungeons with screenshots.

Stretch Goals
Web UI for parameter selection.

Procedural name generator for rooms and NPCs.

AI-assisted description generation.

Project plan not available.
