using System.Collections.Generic;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace DungeonsOnAutomatic.CoreLogic.Graph
{
    public static class RoomGraphBuilder
    {
        public static RoomGraph Build(MapData map, Tag floorTag)
        {
            var graph = new RoomGraph();
            var visited = new bool[map.Width, map.Height];
            int nextId = 0;

            for (int y = 0; y < map.Height; y++)
            {
                for (int x = 0; x < map.Width; x++)
                {
                    if (visited[x, y]) continue;
                    var t = map[x, y];
                    if (t == null || !t.HasTag(floorTag)) continue;

                    var node = new RoomNode(nextId++);
                    var q = new Queue<(int x, int y)>();
                    q.Enqueue((x, y));
                    visited[x, y] = true;

                    long sx = 0, sy = 0;
                    while (q.Count > 0)
                    {
                        var (cx, cy) = q.Dequeue();
                        node.Tiles.Add((cx, cy));
                        sx += cx; sy += cy;
                        var dirs = new (int dx, int dy)[] { (-1,0),(1,0),(0,-1),(0,1) };
                        foreach (var (dx, dy) in dirs)
                        {
                            int nx = cx + dx, ny = cy + dy;
                            if (nx < 0 || ny < 0 || nx >= map.Width || ny >= map.Height) continue;
                            if (visited[nx, ny]) continue;
                            var nt = map[nx, ny];
                            if (nt == null || !nt.HasTag(floorTag)) continue;
                            visited[nx, ny] = true;
                            q.Enqueue((nx, ny));
                        }
                    }

                    node.Size = node.Tiles.Count;
                    if (node.Size > 0)
                    {
                        node.Centroid = ((int)(sx / node.Size), (int)(sy / node.Size));
                    }
                    graph.Nodes.Add(node);
                }
            }

            // For now, no corridor edge extraction. Future: derive edges via portal detection.
            return graph;
        }
    }
}

