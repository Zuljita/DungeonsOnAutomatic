using Godot;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace DungeonsOnAutomatic.GodotGame.Godot;

/// <summary>
/// Renders <see cref="MapData"/> into the Godot scene.
/// TODO: Replace placeholder squares with textured tiles.
/// </summary>
public partial class MapRenderer : Node2D
{
    private static readonly Tag WallTag = new("Wall");
    private static readonly Tag FloorTag = new("Floor");
    
    public MapData? Map { get; set; }
    public int TileSize { get; set; } = 16;

    public override void _Ready()
    {
        if (Map == null)
        {
            GD.Print("MapRenderer has no map data to render.");
        }
    }

    public override void _Draw()
    {
        if (Map == null)
        {
            return;
        }

        for (int y = 0; y < Map.Height; y++)
        {
            for (int x = 0; x < Map.Width; x++)
            {
                var tile = Map[x, y];
                if (tile != null)
                {
                    Color color = GetTileColor(tile);
                    DrawRect(new Rect2(x * TileSize, y * TileSize, TileSize, TileSize), color);
                }
            }
        }
    }

    private Color GetTileColor(MapTile tile)
    {
        if (tile.HasTag(WallTag))
            return Colors.Gray;
        if (tile.HasTag(FloorTag))
            return Colors.White;
        
        // Default color for unrecognized tiles
        return Colors.Pink;
    }
}
