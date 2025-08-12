Project Plan: DungeonsOnAutomatic
Goal:
Create a modular dungeon generation tool that can be run locally with minimal prerequisites, producing maps and associated game content in a system-agnostic way, with an initial focus on a DFRPG system module. Support for other systems (e.g. D&D 5e, GURPS, Savage Worlds) is a stretch goal. Make sure we leave room for modules that impact genre (eg. Fantasy, Sci-Fi, Horror) and map styles (hexes, squares, gridless, hatch).

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
Objective: Implement DFRPG rules/content and design for future systems.

System Module Loader

Dynamically load from /systems.

Example: systems/dfrpg/index.ts implements SystemModule.

DFRPG Module Example

Generates monsters, traps, treasure per room.

Formats statblocks.

Generic/Fallback Module

Always available if no specific system is chosen.

Other System Modules

Support for additional game systems (e.g. D&D 5e, Savage Worlds) is deferred to stretch goals.

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

Web GUI
Allows users to set generator parameters and view ASCII maps and JSON output in the browser.

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
Support for additional system modules beyond DFRPG (e.g., D&D 5e, GURPS, Savage Worlds).
Procedural name generator for rooms and NPCs.

AI-assisted description generation.

Project plan not available.
