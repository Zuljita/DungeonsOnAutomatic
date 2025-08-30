using DungeonsOnAutomatic.CoreLogic.Plugins;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using DungeonsOnAutomatic.CoreLogic.Analysis;

namespace DungeonsOnAutomatic.GodotGame.Plugins
{
    /// <summary>
    /// Simple enrichment: find an Entrance, then place a Treasure tag at the farthest reachable floor.
    /// </summary>
    public class FarthestTreasureEnrichmentPlugin : IEnrichmentPlugin
    {
        public string Name => "Farthest Treasure";
        public string Description => "Adds a treasure at the farthest reachable floor from the entrance.";

        private static readonly Tag Entrance = new("Entrance");
        private static readonly Tag Floor = new("Floor");
        private static readonly Tag Treasure = new("Treasure");

        public void Enrich(MapData mapData)
        {
            var start = MapAnalyzer.FindFirstWithTag(mapData, Entrance);
            if (start.x < 0) return; // No entrance found; nothing to do.

            var far = MapAnalyzer.FindFarthest(mapData, start, new[] { Floor, Entrance });
            var tile = mapData[far.x, far.y];
            if (tile != null && !tile.HasTag(Treasure))
            {
                tile.AddTag(Treasure);
            }
        }
    }
}

