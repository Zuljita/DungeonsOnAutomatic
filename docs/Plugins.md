# Plugins

Purpose: Explain plugin extension points and best practices when providing content/rules.

## Interfaces

- `IMapRulesetPlugin`
  - Input: None at construction time.
  - Methods:
    - `RegisterTags(TagService tagService)`: Register all affinities/antagonisms used by the tileset.
    - `TileSetData GetTileSet()`: Return the complete set of `TileData`.
    - `IEnumerable<(int x, int y, TileData tile)> GetSeeds()`: Seed placements (must reference tiles from the tileset).

- `IEnrichmentPlugin` (optional)
  - Input: `MapData` (Phase 4 placeholder; future: RoomGraphArtifact).
  - Logic: Post-process map (e.g., decorate, spawn items).
  - Output: Mutated/augmented map data.

## PluginManager

- Registers ruleset and enrichment plugins; WorldGenerator pulls from here.

## Best Practices

- Register all rules in `RegisterTags` against the `TagService` used by `WfcService`.
- Return the same `TileData` instances from `GetSeeds()` that appear in `GetTileSet().Tiles`.
- Keep tiles minimal: prefer tags to encode semantics; use weights for distribution.

