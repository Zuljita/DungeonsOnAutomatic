# Plugin Author Guide

Short, practical guidance for implementing `IMapRulesetPlugin` (and `IEnrichmentPlugin`).

## Inputs / Outputs

- Input: None at construction. You’ll get a `TagService` in `RegisterTags`.
- Output: `TileSetData` (your tiles), `Seeds` (coordinates + tiles from your tileset), optional enrichment of `MapData`.

## Do

- Register all tag rules in `RegisterTags(TagService service)` — the `service` provided by `WfcService` is the single source of truth during generation.
- Return the same `TileData` instances from `GetSeeds()` that you returned in `GetTileSet().Tiles`.
- Set sane `Weight` values (e.g., `Floor` > `Wall`) to bias distribution.
- Use tags to encode semantics (Entrance, Treasure, Water, etc.); avoid over‑encoding in tile names.
- Keep `GetSeeds()` minimal and deterministic where possible — seeding too many cells can overconstrain generation.

## Don’t

- Don’t construct new `TileData` for seeds; seeds must reference tiles from your tileset.
- Don’t rely on `TileSetData.TagService` for rules during generation; constraints read the `WfcService` TagService.
- Don’t hardcode engine paths or resources inside CoreLogic types.

## Minimal Example

```csharp
public class MyRuleset : IMapRulesetPlugin
{
    private readonly Tag _wall = new("Wall");
    private readonly Tag _floor = new("Floor");
    private TileData? _wallTile, _floorTile;

    public string Name => "My Rules";
    public string Description => "Walls and floors";

    public void RegisterTags(TagService tags)
    {
        tags.AddAntagonism(_wall, _floor);
    }

    public TileSetData GetTileSet()
    {
        _floorTile ??= new TileData("Floor", _floor) { Weight = 3 };
        _wallTile  ??= new TileData("Wall",  _wall)  { Weight = 1 };
        return new TileSetData("Basic") { Tiles = new[] { _floorTile, _wallTile } };
    }

    public IEnumerable<(int x, int y, TileData tile)> GetSeeds()
    {
        if (_floorTile != null)
            yield return (0, 0, _floorTile);
    }
}
```

## Testing Tips

- Build and run unit tests (`dotnet test`).
- Validate `GetSeeds()` by asserting `tileSet.Tiles.Contains(seed.tile)`.
- Use small maps (e.g., 10×10) while iterating.

