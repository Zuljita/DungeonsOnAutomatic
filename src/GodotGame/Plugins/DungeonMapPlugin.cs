using System.Collections.Generic;
#nullable enable
using DungeonsOnAutomatic.CoreLogic.Plugins;
using DungeonsOnAutomatic.CoreLogic.Resources;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace DungeonsOnAutomatic.GodotGame.Plugins
{
    public class DungeonMapPlugin : IMapRulesetPlugin
    {
        public string Name => "Dungeon Demo";
        public string Description => "Dungeon ruleset with walls, floors, entrance, and treasure.";

        private readonly Tag _wall = new("Wall");
        private readonly Tag _floor = new("Floor");
        private readonly Tag _entrance = new("Entrance");
        private readonly Tag _treasure = new("Treasure");

        // Keep single instances so seeds reference the same TileData objects present in the tileset
        private TileData? _floorTile;
        private TileData? _wallTile;
        private TileData? _entranceTile;
        private TileData? _treasureTile;

        public void RegisterTags(TagService tagService)
        {
            // Core antagonism
            tagService.AddAntagonism(_wall, _floor);

            // Affinities: special tiles prefer to be on floor
            tagService.AddAffinity(_entrance, _floor);
            tagService.AddAffinity(_treasure, _floor);
        }

        public TileSetData GetTileSet()
        {
            _floorTile ??= new TileData("Floor", _floor) { Weight = 4.0f };
            _wallTile ??= new TileData("Wall", _wall) { Weight = 1.0f };
            _entranceTile ??= new TileData("Entrance", _entrance, _floor)
            {
                Weight = 0.2f,
                CanBeSeed = true
            };
            _treasureTile ??= new TileData("Treasure", _treasure, _floor)
            {
                Weight = 0.1f,
                CanBeSeed = true
            };

            var tiles = new List<TileData>
            {
                _floorTile,
                _wallTile,
                _entranceTile,
                _treasureTile
            };

            var tileSet = new TileSetData("Dungeon")
            {
                Tiles = tiles.ToArray(),
                Description = "Basic dungeon tiles"
            };

            tileSet.InitializeTagRelationships();
            return tileSet;
        }

        public IEnumerable<(int x, int y, TileData tile)> GetSeeds()
        {
            // Seed a single Entrance; coordinates assume a 20x20 default (center).
            if (_entranceTile != null)
            {
                yield return (10, 10, _entranceTile);
            }
        }
    }
}
