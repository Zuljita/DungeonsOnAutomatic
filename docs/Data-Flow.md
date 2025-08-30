# Data Flow

Purpose: Provide an end-to-end sequence for how a world is generated and rendered.

1) WorldGenerator (Godot)
   - Creates `TagService` and `WfcService(tagService)`.
   - Registers `IMapRulesetPlugin`.
   - Calls `plugin.RegisterTags(tagService)`; fetches `tileset = plugin.GetTileSet()` and `seeds = plugin.GetSeeds()`.

2) WfcService.Generate(width, height, tileset, seeds)
   - Builds `WfcGrid(width, height, tileset.Tiles)` and adds constraints:
     - `SeedConstraint(seeds)` if any.
     - `TagAdjacencyConstraint(tagService)`.
   - Calls `grid.Generate()` which:
     - `Initialize()` constraints (apply seeds; propagate from seeds; validate collapsed neighbors).
     - Iteratively `Step()` collapse/propagate/backtrack.
   - On success: `grid.ToMapData()` → returns `MapData`.
   - On failure: throws `InvalidOperationException`.

3) MapRenderer.Render(mapData)
   - Iterates tiles and sets TileMap cells based on tags.

Outputs:
- Success: Visualized dungeon in Godot.
- Failure: Clear exception to the caller; caller may retry with different seeds/tiles.

