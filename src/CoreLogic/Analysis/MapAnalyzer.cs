using System;
using System.Collections.Generic;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace DungeonsOnAutomatic.CoreLogic.Analysis
{
    /// <summary>
    /// Lightweight analysis utilities over MapData for enrichment.
    /// </summary>
    public static class MapAnalyzer
    {
        /// <summary>
        /// Finds the first tile position with a given tag. Returns (-1,-1) if not found.
        /// </summary>
        public static (int x, int y) FindFirstWithTag(MapData map, Tag tag)
        {
            for (int y = 0; y < map.Height; y++)
            {
                for (int x = 0; x < map.Width; x++)
                {
                    var t = map[x, y];
                    if (t != null && t.HasTag(tag))
                        return (x, y);
                }
            }
            return (-1, -1);
        }

        /// <summary>
        /// Finds the farthest reachable position from the given start among passable tiles.
        /// A tile is considered passable if it has any of the provided passable tags.
        /// Returns start if no movement is possible.
        /// </summary>
        public static (int x, int y, int distance) FindFarthest(MapData map, (int x, int y) start, IReadOnlyCollection<Tag> passable)
        {
            if (start.x < 0 || start.y < 0) return (start.x, start.y, 0);

            var visited = new bool[map.Width, map.Height];
            var q = new Queue<(int x, int y, int d)>();
            q.Enqueue((start.x, start.y, 0));
            visited[start.x, start.y] = true;

            (int x, int y, int d) farthest = (start.x, start.y, 0);

            var dirs = new (int dx, int dy)[] { (-1,0), (1,0), (0,-1), (0,1) };
            while (q.Count > 0)
            {
                var cur = q.Dequeue();
                if (cur.d > farthest.d) farthest = cur;

                foreach (var (dx, dy) in dirs)
                {
                    int nx = cur.x + dx;
                    int ny = cur.y + dy;
                    if (nx < 0 || ny < 0 || nx >= map.Width || ny >= map.Height) continue;
                    if (visited[nx, ny]) continue;
                    var t = map[nx, ny];
                    if (t == null) continue;
                    if (!t.HasAnyTag(passable)) continue;
                    visited[nx, ny] = true;
                    q.Enqueue((nx, ny, cur.d + 1));
                }
            }

            return farthest;
        }
    }
}

