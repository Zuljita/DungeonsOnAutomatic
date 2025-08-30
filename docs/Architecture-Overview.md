# Architecture Overview

Purpose: Give future agents a high-level map of the system to navigate quickly. Focus on inputs, core logic, outputs, and how pieces connect.

## Components

- CoreLogic.Tagging
  - Input: Tag names and relationships (affinity, antagonism) registered into a `TagService`.
  - Logic: Symmetric relationship management; compatibility checks.
  - Output: Queryable compatibility (`AreCompatible`), affinity/antagonism lookups.

- CoreLogic.Resources (TileData, TileSetData)
  - Input: Tile definitions (names, tags, weights), tilesets.
  - Logic: Tile tag management and simple weighted selection helpers.
  - Output: `TileData[]` and per-tileset TagService (currently secondary; see Pitfalls).

- CoreLogic.Generation (WFC engine)
  - Input: Width/height, `TileSetData`, seed placements, active `TagService` rules, RNG.
  - Logic: WFC grid (`WfcGrid`) orchestrates observation (collapse) + propagation via constraints.
  - Output: `MapData` or failure (throws InvalidOperationException).

- CoreLogic.Map (MapData/MapTile)
  - Input: Collapsed grid of `TileData`.
  - Logic: Simple tagged tile container; primary tag + additional tags.
  - Output: `MapData` addressed by `[x, y]` and enumerables.

- GodotGame (WorldGenerator, MapRenderer, Plugins)
  - Input: Registered IMapRulesetPlugin(s), Godot scene with `MapRenderer` TileMap.
  - Logic: `WorldGenerator` builds a `WfcService`, pulls tiles/seeds from plugin, runs generation, then calls renderer.
  - Output: Rendered TileMap in the scene.

## Data Flow

1) WorldGenerator
   - Input: `IMapRulesetPlugin` -> RegisterTags(TagService), GetTileSet(), GetSeeds().
   - Calls: `WfcService.Generate(width, height, tileSet, seeds...)`.
2) WfcService
   - Builds `WfcGrid(width, height, tileSet.Tiles)`.
   - Adds `SeedConstraint` (if seeds) and `TagAdjacencyConstraint`.
   - Runs `grid.Generate()`, returns `grid.ToMapData()`.
3) MapRenderer
   - Input: `MapData`.
   - Logic: Maps tags to TileMap cells (hardcoded IDs for now).
   - Output: Visual map.

## Extensibility

- Add constraints: Implement `IWFCConstraint` and add via `grid.AddConstraint` in `WfcService`.
- Add content: Implement `IMapRulesetPlugin` (tags, tileset, seeds). Optionally `IEnrichmentPlugin` for post-processing.

## Pitfalls & Gotchas

- Single TagService source: WFC uses the `TagService` owned by `WfcService`. `TileSetData.TagService` is currently not consulted by constraints. Ensure all rules are registered through the WFC `TagService` (e.g., plugin `RegisterTags`).
- Seeding: Seeds must reference the same `TileData` instances that exist in the tileset (reference equality). Do not create new `TileData` instances in `GetSeeds`.
- Rendering: MapRenderer uses hardcoded tile IDs (0=Wall, 1=Floor, 2=Entrance, 3=Treasure). Ensure the Godot TileSet matches or update mapping logic.
- Backtracking: `WfcGrid` removes a failing tile after backtrack to avoid infinite loops; unsatisfiable inputs throw with a clear error.

