using Godot;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace DungeonsOnAutomatic.GodotGame.Godot
{
    public partial class MapRenderer : TileMap
    {
        private static readonly Tag WallTag = new("Wall");
        private static readonly Tag FloorTag = new("Floor");

        // For now, we'll use hardcoded tile IDs.
        // In the future, this would be driven by the TileSet resource.
        private const int WallTileId = 0;
        private const int FloorTileId = 1;

        public void Render(MapData map)
        {
            Clear();

            for (int y = 0; y < map.Height; y++)
            {
                for (int x = 0; x < map.Width; x++)
                {
                    var tile = map[x, y];
                    if (tile != null)
                    {
                        int tileId = -1;
                        if (tile.HasTag(WallTag))
                        {
                            tileId = WallTileId;
                        }
                        else if (tile.HasTag(FloorTag))
                        {
                            tileId = FloorTileId;
                        }

                        if (tileId != -1)
                        {
                            SetCell(0, new Vector2I(x, y), 0, new Vector2I(tileId, 0));
                        }
                    }
                }
            }
        }
    }
}
