using Godot;
using CoreLogic.Tagging;

namespace GodotGame.Scripts;

[GlobalClass]
public partial class TileSetData : Resource
{
    [Export] public string SetName { get; set; } = string.Empty;
    [Export] public TileData[] Tiles { get; set; } = Array.Empty<TileData>();
    [Export] public TileData[] SeedTiles { get; set; } = Array.Empty<TileData>();

    public TileData? GetTileByName(string name)
    {
        return Tiles.FirstOrDefault(t => t.TileName == name);
    }

    public IEnumerable<TileData> GetTilesWithTag(string tagName)
    {
        return Tiles.Where(t => t.HasTag(tagName));
    }

    public IEnumerable<TileData> GetTilesWithTag(Tag tag)
    {
        return Tiles.Where(t => t.Tags.Contains(tag));
    }

    public bool IsValidTileSet()
    {
        // Check for duplicate tile names
        var names = Tiles.Select(t => t.TileName).ToList();
        if (names.Count != names.Distinct().Count())
            return false;

        // Check that all seed tiles are also in the main tiles array
        foreach (var seedTile in SeedTiles)
        {
            if (!Tiles.Contains(seedTile))
                return false;
        }

        return true;
    }
}