using Godot;
using DungeonsOnAutomatic.CoreLogic.Map;

namespace DungeonsOnAutomatic.GodotGame.Godot;

/// <summary>
/// Renders <see cref="MapData"/> into the Godot scene.
/// TODO: Replace placeholder squares with textured tiles.
/// </summary>
public partial class MapRenderer : Node2D
{
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
                Color color = tile.Tag == "Wall" ? Colors.Gray : Colors.White;
                DrawRect(new Rect2(x * TileSize, y * TileSize, TileSize, TileSize), color);
            }
        }
    }
}
