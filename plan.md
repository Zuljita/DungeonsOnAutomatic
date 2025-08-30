Project Plan: Tag-Driven Procedural Map Generator
This document provides the complete technical specification and working guidelines for all AI agents contributing to this project. It synthesizes the best elements from all provided plans into a single source of truth.

1. Foundational Architecture
This project's foundation is built on a clean, scalable, and professional structure to promote modularity and minimize technical debt.

Project and Solution Structure
The project will use a multi-project C# solution to enforce a strong separation of concerns.

CoreLogic Project: A standard .NET class library that is completely engine-agnostic. It will contain:

The WFC solver, propagators, and constraint interfaces.

Core data models and algorithms.

All business logic that can be unit-tested without the Godot runtime.

GodotGame Project: The main Godot C# project. It will contain:

A reference to the CoreLogic project.

All classes that derive from Godot.Node or other Godot types.

Scene-specific scripts, UI controllers, and visualization code.

Coding Standards and Patterns
Consistency is crucial for long-term maintainability.

Naming Conventions:

C# script files (.cs) will use PascalCase (e.g., WorldGenerator.cs).

All other Godot assets (.tscn, .tres, images) will use snake_case (e.g., world_generator.tscn) to prevent case-sensitivity issues on deployment.

Scene Communication: The "call down, signal up" paradigm is mandatory.

A parent node can call methods on its direct children.

A child node must never hold a direct reference to its parent; it communicates events upwards using C# event declarations or Godot signals.

Script Member Ordering: All C# scripts will follow a consistent member order to improve readability:

Events / Signals

[Export] variables

Public properties and fields

Private properties and fields

Godot lifecycle methods (_Ready, _Process, etc.)

Public methods

Private methods

2. Hybrid Data-Driven Strategy
We will leverage the unique strengths of two different data formats for their specific use cases: development and user-facing data.

Internal Development Data (Godot Resources): All game design data (tile definitions, enemy stats, rulesets) will be defined using custom C# classes inheriting from Godot.Resource. Instances will be saved as text-based .tres files.

Benefits: This provides deep editor integration, strong type safety, and the ability to directly reference other assets like textures and scenes.

Implementation: Resource classes will be marked with the [GlobalClass] attribute to make them available in the editor and use [Export] to expose properties to the inspector.

User-Facing Data (JSON): All data generated at runtime for the user (save files) or intended for user modification (mods) will use the JSON format exclusively.

Benefit (Security): The primary motivation is security. Godot Resource files can embed and execute script code, creating a potential malware vector if shared between users. JSON is a pure-data format and carries no such risk.

Implementation: A dedicated SaveLoadManager class will act as a security firewall, translating the game's internal Resource-based state into a safe, code-free JSON structure for saving and loading.

3. Wave Function Collapse (WFC) Engine
The WFC engine is the technical core of the project. It will be designed as a flexible and extensible constraint satisfaction framework, not a monolithic algorithm.

Core WFC Solver
The solver will be implemented in the CoreLogic project for portability and unit testing.

WfcCell: Represents a single position on the grid, maintaining a list of possible TileData resources and its current entropy.

WfcGrid: Manages the 2D array of WfcCell objects and orchestrates the main observation-propagation loop.

Backtracking: The solver must incorporate a backtracking or restart mechanism to robustly handle complex constraints and avoid generation failures.

Pluggable Constraint System
The key innovation is a pluggable architecture for applying rules. This is achieved via the IWFCConstraint interface.

// Defined in the CoreLogic project
public interface IWFCConstraint 
{
    // Called once before generation to apply initial constraints.
    void Initialize(WfcGrid grid);

    // Called after each propagation step to check for violations
    // or apply dynamic constraints to the evolving grid.
    void Check(WfcGrid grid);
}

This allows for the modular addition of complex rules (e.g., path connectivity, enemy density) without modifying the core solver. The simple tag-based adjacency rules will be implemented in a class named TagAdjacencyConstraint which implements this interface.

4. Plugin Architecture and Data Pipeline
To keep the core engine clean and allow for easy content creation, the project will use a static plugin architecture and a well-defined data pipeline.

The Generation Pipeline
The generation process follows a clear data transformation pipeline, with key "artifacts" being produced at each step for the next step to consume.
Ruleset Plugins → WFC Solver + Constraint Plugins → Generated Tile Grid → Graph Generation Step → Room Graph Artifact → Enrichment Plugins

Room Graph Artifact: This is a crucial, high-level data structure generated after the WFC completes. It represents the map not as tiles, but as a graph of nodes (rooms, points of interest) and edges (corridors, connections). This artifact is the primary input for enrichment plugins.

Plugin Roles
IMapRulesetPlugin: Defines a content pack. It is responsible for registering tags and providing the set of available tiles and seeds for generation.

IEnrichmentPlugin: An optional plugin for post-processing a successfully generated map. It operates on the Room Graph Artifact to intelligently place game elements like keys, bosses, or treasure based on the map's semantic structure.

IWFCConstraint: As defined above, these plugins hook directly into the WFC solver to apply complex, non-local, or dynamic generation rules.

Plugins will be instantiated and registered manually in a PluginManager or similar bootstrap script; there will be no automatic discovery or hot-reloading.

5. AI-Assisted Development Workflow
All agents must adhere to a disciplined and professional methodology. The human developer is the final architect and quality gatekeeper.

Core Philosophy
Developer as Editor: The workflow is not to "ask an LLM to build a feature" but to delegate specific, well-defined sub-tasks. The developer specifies, prompts, and then rigorously reviews and refactors the AI's output.

40/20/40 Framework: Effort on any AI-assisted task should be allocated roughly as 40% prompt engineering, 20% generation, and 40% human review and refactoring. This mandatory review step is crucial for maintaining code quality.

Agent Working Agreement (MANDATORY)
These are hard rules, not guidelines.

Read First: Before starting any task, an agent must consult the latest versions of plan.md (this file), DECISIONS.md, and TASKS.md.

Git Workflow:

Never work on the main branch.

Always create a feature branch with a descriptive name (e.g., feature/pluggable-constraint-system).

Write detailed commit messages explaining the what and the why of the change.

The Single Path Rule: Never create multiple ways to perform the same function. If a system for rendering a map exists, extend it; do not create a parallel one. This is the most critical quality rule.

Aggressive Cleanup: Immediately delete any unused code, commented-out blocks, or dead files. There are no backwards compatibility concerns during this stage of development.

Agent Roles
ChatGPT: Specializes in Godot C# implementation, TileMap rendering, and using Godot-specific APIs.

Claude: Specializes in C# architecture, interface design, cross-system integration, and refactoring.

Gemini: Specializes in research, validation of technical approaches, and performance analysis.

6. Strategic Roadmap
The project will be developed in four distinct phases.

Phase 1: Foundation and Core Systems
Tasks:

Set up the multi-project C# solution (CoreLogic, GodotGame) and configure version control (.gitignore, .gitattributes for LFS).

Implement the core tagging system (Tag, ITaggable, TagService) in CoreLogic.

Define the TileData and TileSetData custom Resource classes.

Create unit tests for the TagService to verify relationship logic.

Definition of Done: The solution compiles. The TagService correctly manages symmetric antagonisms and affinities. Unit tests pass.

Phase 2: Tag-Aware WFC Engine
Tasks:

Implement the core WFC solver (WfcCell, WfcGrid) and the backtracking mechanism in CoreLogic.

Implement the IWFCConstraint interface.

Create the first constraint plugin, TagAdjacencyConstraint, which uses the TagService to enforce adjacency rules.

Implement support for pre-placing Seed tiles.

Definition of Done: The WFC solver can generate a 20x20 grid where no antagonistic tiles are adjacent. Seeds are honored, and affinity produces visible clustering. The generation is reproducible with a given RNG seed.

Phase 3: Plugin Architecture & Visualization
Tasks:

Define the IMapRulesetPlugin and IEnrichmentPlugin interfaces in CoreLogic.

Build a PluginManager in GodotGame for static plugin registration.

In GodotGame, create a WorldGenerator node that uses the plugins to configure and run the CoreLogic WFC solver.

Implement the visualization layer to render the resulting WfcGrid to a Godot TileMap.

Definition of Done: The core engine runs entirely using content from a dummy plugin. The generated map is rendered visually as a TileMap in a minimal demo scene.

Phase 4: Dungeon Demo and Advanced Features
Tasks:

Implement a sample DungeonMapPlugin with wall, floor, entrance, and treasure tags and tiles.

Implement the Graph Generation step that analyzes the final tile grid and produces the Room Graph Artifact.

Implement a simple IEnrichmentPlugin that uses the room graph to intelligently place entrance/exit markers.

Create a basic UI with a "Regenerate" button (or R key input).

Integrate the AI agent workflow by creating DECISIONS.md and TASKS.md files and enforcing their use.

Definition of Done: Running the app displays coherent dungeon layouts. The enrichment plugin correctly places markers based on the graph's structure. The project successfully generates a 48x32 map in under 2 seconds.
