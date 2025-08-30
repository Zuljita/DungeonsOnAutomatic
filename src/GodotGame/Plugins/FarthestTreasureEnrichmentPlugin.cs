using DungeonsOnAutomatic.CoreLogic.Plugins;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using DungeonsOnAutomatic.CoreLogic.Analysis;
using DungeonsOnAutomatic.CoreLogic.Graph;

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

            // Prefer a different room than the entrance for treasure placement
            var graph = RoomGraphBuilder.Build(mapData, Floor);
            if (graph.Nodes.Count > 0)
            {
                int entranceRoomId = -1;
                foreach (var node in graph.Nodes)
                {
                    if (node.Tiles.Contains(start)) { entranceRoomId = node.Id; break; }
                }

                (int x, int y) target = start;
                double best = -1;
                foreach (var node in graph.Nodes)
                {
                    if (node.Id == entranceRoomId) continue;
                    var dx = node.Centroid.x - start.x;
                    var dy = node.Centroid.y - start.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 > best)
                    {
                        best = d2;
                        target = node.Centroid;
                    }
                }

                var tile = mapData[target.x, target.y];
                if (tile != null && !tile.HasTag(Treasure))
                {
                    tile.AddTag(Treasure);
                }
                return;
            }

            // Fallback: BFS farthest on floors
            var far = MapAnalyzer.FindFarthest(mapData, start, new[] { Floor, Entrance });
            var t2 = mapData[far.x, far.y];
            if (t2 != null && !t2.HasTag(Treasure))
            {
                t2.AddTag(Treasure);
            }
        }
    }
}
