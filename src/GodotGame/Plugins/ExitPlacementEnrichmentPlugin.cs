using DungeonsOnAutomatic.CoreLogic.Plugins;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using DungeonsOnAutomatic.CoreLogic.Graph;

namespace DungeonsOnAutomatic.GodotGame.Plugins
{
    /// <summary>
    /// Places an Exit at the centroid of the farthest room from the Entrance.
    /// Falls back to farthest tile BFS if only a single room exists.
    /// </summary>
    public class ExitPlacementEnrichmentPlugin : IEnrichmentPlugin
    {
        public string Name => "Exit Placement";
        public string Description => "Adds an Exit tag at a room farthest from the entrance.";

        private static readonly Tag Entrance = new("Entrance");
        private static readonly Tag Floor = new("Floor");
        private static readonly Tag Exit = new("Exit");

        public void Enrich(MapData mapData)
        {
            // Find entrance tile position
            (int x, int y) entrancePos = (-1, -1);
            for (int y = 0; y < mapData.Height && entrancePos.x < 0; y++)
            {
                for (int x = 0; x < mapData.Width; x++)
                {
                    var t = mapData[x, y];
                    if (t != null && t.HasTag(Entrance)) { entrancePos = (x, y); break; }
                }
            }
            if (entrancePos.x < 0) return;

            // Build graph and choose farthest room centroid
            var graph = RoomGraphBuilder.Build(mapData, Floor);
            if (graph.Nodes.Count == 0)
                return;

            // Identify entrance room (by membership)
            int entranceRoomId = -1;
            foreach (var node in graph.Nodes)
            {
                if (node.Tiles.Contains(entrancePos)) { entranceRoomId = node.Id; break; }
            }

            (int x, int y) target = entrancePos;

            if (entranceRoomId >= 0 && graph.Nodes.Count > 1)
            {
                // Pick the largest room farthest by simple heuristic: maximum |centroid - entrance| distance.
                double maxDist = -1;
                foreach (var node in graph.Nodes)
                {
                    if (node.Id == entranceRoomId) continue;
                    var dx = node.Centroid.x - entrancePos.x;
                    var dy = node.Centroid.y - entrancePos.y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 > maxDist)
                    {
                        maxDist = d2;
                        target = node.Centroid;
                    }
                }
            }
            else
            {
                // Fallback: place exit as far as possible within the same room (approximate)
                // Simple BFS on floor tiles from entrance
                var visited = new bool[mapData.Width, mapData.Height];
                var q = new System.Collections.Generic.Queue<(int x, int y, int d)>();
                q.Enqueue((entrancePos.x, entrancePos.y, 0));
                visited[entrancePos.x, entrancePos.y] = true;
                var dirs = new (int dx, int dy)[] { (-1,0),(1,0),(0,-1),(0,1) };
                (int x, int y, int d) far = (entrancePos.x, entrancePos.y, 0);
                while (q.Count > 0)
                {
                    var cur = q.Dequeue();
                    if (cur.d > far.d) far = cur;
                    foreach (var (dx, dy) in dirs)
                    {
                        int nx = cur.x + dx, ny = cur.y + dy;
                        if (nx < 0 || ny < 0 || nx >= mapData.Width || ny >= mapData.Height) continue;
                        if (visited[nx, ny]) continue;
                        var t = mapData[nx, ny];
                        if (t == null || !t.HasTag(Floor)) continue;
                        visited[nx, ny] = true;
                        q.Enqueue((nx, ny, cur.d + 1));
                    }
                }
                target = (far.x, far.y);
            }

            var targetTile = mapData[target.x, target.y];
            if (targetTile != null && !targetTile.HasTag(Exit))
            {
                targetTile.AddTag(Exit);
            }
        }
    }
}

