using Godot;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace DungeonsOnAutomatic.GodotGame.Godot
{
    public partial class MapRenderer : TileMap
    {
        private static readonly Tag WallTag = new("Wall");
        private static readonly Tag FloorTag = new("Floor");
        private static readonly Tag EntranceTag = new("Entrance");
        private static readonly Tag ExitTag = new("Exit");
        private static readonly Tag TreasureTag = new("Treasure");

        // Configurable atlas tile IDs (defaults provided).
        [Export] public int WallTileId { get; set; } = 0;
        [Export] public int FloorTileId { get; set; } = 1;
        [Export] public int EntranceTileId { get; set; } = 2;
        [Export] public int TreasureTileId { get; set; } = 3;
        [Export] public int ExitTileId { get; set; } = 4;

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
                        // Check specific tags first so multi-tag tiles (Entrance/Exit/Treasure + Floor)
                        // render with their special appearance.
                        if (tile.HasTag(EntranceTag))
                        {
                            tileId = EntranceTileId;
                        }
                        else if (tile.HasTag(ExitTag))
                        {
                            tileId = ExitTileId;
                        }
                        else if (tile.HasTag(TreasureTag))
                        {
                            tileId = TreasureTileId;
                        }
                        else if (tile.HasTag(WallTag))
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
