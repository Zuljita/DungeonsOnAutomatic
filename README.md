Dungeons on Automatic
📖 Overview
This project is a procedural map generator built with Godot 4.x and C# (.NET). The core of the engine is a Wave Function Collapse (WFC) algorithm driven by a flexible tagging system. The entire architecture is designed to be highly modular and extensible through a static plugin system, allowing for the easy addition of new content, generation rules, and game logic.

This repository is developed with the assistance of multiple AI agents, and all contributors (human or AI) are expected to adhere to the guidelines outlined in the plan.md and AGENTS.md documents.

🏛️ Core Architectural Pillars
The project is built on several key architectural decisions that ensure scalability, testability, and a clean separation of concerns.

Multi-Project C# Solution: To enforce a strict separation between core logic and engine-specific code, the project uses a multi-project solution.

CoreLogic: An engine-agnostic .NET class library containing the WFC solver, data models, and other core algorithms. This allows for unit testing outside the Godot runtime.

GodotGame: The main Godot project, which contains all Node-derived classes, scene scripts, and visualization code.

Pluggable Architecture & Data Pipeline: The generation process is a well-defined data pipeline that allows for powerful extensibility.

Pipeline: Ruleset Plugins → WFC Solver + Constraint Plugins → Generated Tile Grid → Graph Generation Step → Room Graph Artifact → Enrichment Plugins

Plugin Roles: Different interfaces (IMapRulesetPlugin, IWFCConstraint, IEnrichmentPlugin) allow for modularly adding content, generation rules, and post-processing logic.

Hybrid Data Strategy: The project leverages the unique strengths of two data formats.

Godot Resources (.tres): Used for all internal development data (tile definitions, etc.) to take advantage of deep editor integration and type safety.

JSON: Used exclusively for user-facing data like save files and mods due to its inherent security (it cannot execute code).

🚀 Current Status
The project is currently in Phase 1: Foundation and Core Systems.

The immediate focus is on setting up the solution architecture, implementing the core tagging system, and defining the primary data structures (TileData, TileSetData).

🛠️ Getting Started
Prerequisites
Godot Engine 4.x (with .NET support)

.NET SDK 8.x or later

Build & Run
Clone the repository.

Open the C# solution (.sln) and restore the NuGet packages.

Build the solution to ensure the CoreLogic library is compiled.

Open the project in the Godot editor. The main scene should run without errors.

🤝 How to Contribute
All development must follow the detailed specifications and workflows outlined in the official project plan.

➡️ Review [DECISIONS.md](DECISIONS.md) for logged decisions and [TASKS.md](TASKS.md) for active work.
➡️ Read the plan.md and AGENTS.md files before making any changes.

Key Development Rules (MANDATORY)
The Single Path Rule: Never create a parallel system for something that already exists. Extend, modify, or replace—do not duplicate.

Aggressive Cleanup: Immediately delete all unused code, commented-out blocks, and dead files.

Git Workflow: All work must be done on feature branches. Commit messages must be descriptive. Never commit directly to main.
