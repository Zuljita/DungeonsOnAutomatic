using DungeonsOnAutomatic.CoreLogic.Plugins;
using DungeonsOnAutomatic.CoreLogic.Resources;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using System.Collections.Generic;

namespace DungeonsOnAutomatic.GodotGame.Plugins
{
    public class DummyRulesetPlugin : IMapRulesetPlugin
    {
        public string Name => "Dummy Ruleset";
        public string Description => "A simple ruleset for testing.";

        public void RegisterTags(TagService tagService)
        {
            tagService.AddAntagonism(new Tag("Wall"), new Tag("Floor"));
        }

        public TileSetData GetTileSet()
        {
            var tileSet = new TileSetData("Simple");
            var floorTile = new TileData("Floor", new Tag("Floor")) { Weight = 3.0f };
            var wallTile = new TileData("Wall", new Tag("Wall")) { Weight = 1.0f };
            tileSet.AddTile(floorTile);
            tileSet.AddTile(wallTile);
            return tileSet;
        }

        public IEnumerable<(int x, int y, TileData tile)> GetSeeds()
        {
            return new List<(int x, int y, TileData tile)>();
        }
    }
}
