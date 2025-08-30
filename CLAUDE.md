# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a procedural map generator built with Godot 4.x and C# (.NET), featuring a Wave Function Collapse (WFC) algorithm driven by a flexible tagging system. The project is currently in Phase 1: Foundation and Core Systems development.

## Architecture

### Multi-Project C# Solution Structure
- **CoreLogic**: Engine-agnostic .NET class library containing WFC solver, data models, and core algorithms (allows unit testing outside Godot runtime)
- **GodotGame**: Main Godot project with Node-derived classes, scene scripts, and visualization code

### Data Strategy
- **Godot Resources (.tres)**: Internal development data (tile definitions, etc.) for editor integration and type safety
- **JSON**: User-facing data (save files, mods) for security (cannot execute code)

### Plugin Architecture
Generation pipeline: Ruleset Plugins → WFC Solver + Constraint Plugins → Generated Tile Grid → Graph Generation Step → Room Graph Artifact → Enrichment Plugins

Key interfaces:
- `IMapRulesetPlugin`: Defines content packs
- `IWFCConstraint`: Hooks into WFC solver for complex generation rules  
- `IEnrichmentPlugin`: Post-processes generated maps using Room Graph Artifact

## Development Commands

Since the project is in early development phase without a complete build system yet:

1. **Setup**: Open C# solution (.sln) and restore NuGet packages
2. **Build**: Build the solution to compile CoreLogic library
3. **Run**: Open project in Godot editor - main scene should run without errors

## Critical Development Rules

### Mandatory Guidelines (from agents.md)
- **Single Path Rule**: Never create parallel systems - extend, modify, or replace existing ones
- **Aggressive Cleanup**: Immediately delete unused code, commented-out blocks, and dead files
- **Git Workflow**: All work on feature branches, descriptive commit messages, never commit to main
- **No Backwards Compatibility**: Make breaking changes freely during this development phase

### Code Standards
- **Naming**: C# files use PascalCase (.cs), Godot assets use snake_case (.tscn, .tres)
- **Communication**: "Call down, signal up" - parent calls child methods, child signals events up
- **Script Order**: Events/Signals, [Export] variables, Public properties, Private properties, Godot lifecycle methods, Public methods, Private methods

### Key File References
According to agents.md, be aware of these files when they exist:
- `src/Tagging/TaggingSystem.cs`: Tag logic, affinities, and antagonisms
- `src/Generation/WfcService.cs`: Core Wave Function Collapse solver
- `src/Map/MapData.cs`: Primary data structures for generated maps
- `src/Godot/MapRenderer.cs`: Visualization within Godot engine

## Current Phase: Foundation and Core Systems

**Active Goals:**
- Set up multi-project C# solution (CoreLogic, GodotGame)
- Implement core tagging system (Tag, ITaggable, TagService)
- Define TileData and TileSetData custom Resource classes
- Create unit tests for TagService

**Definition of Done**: Solution compiles, TagService manages symmetric antagonisms and affinities, unit tests pass.

## Required Reading
Before any development task, agents must review:
- `plan.md`: Complete technical specification
- `agents.md`: AI agent workflow and rules
- This file for current context