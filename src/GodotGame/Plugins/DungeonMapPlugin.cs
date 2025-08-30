using System.Collections.Generic;
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
            var tiles = new List<TileData>();

            var floor = new TileData("Floor", _floor) { Weight = 4.0f };
            var wall = new TileData("Wall", _wall) { Weight = 1.0f };
            var entrance = new TileData("Entrance", _entrance, _floor)
            {
                Weight = 0.2f,
                CanBeSeed = true
            };
            var treasure = new TileData("Treasure", _treasure, _floor)
            {
                Weight = 0.1f,
                CanBeSeed = true
            };

            tiles.Add(floor);
            tiles.Add(wall);
            tiles.Add(entrance);
            tiles.Add(treasure);

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
            var entrance = new TileData("Entrance", _entrance, _floor) { CanBeSeed = true };
            yield return (10, 10, entrance);
        }
    }
}

