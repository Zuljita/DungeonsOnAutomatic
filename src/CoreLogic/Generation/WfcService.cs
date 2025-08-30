using System;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace DungeonsOnAutomatic.CoreLogic.Generation;

/// <summary>
/// Basic scaffold for the Wave Function Collapse solver.
/// TODO: Replace random filler with actual constraint propagation.
/// </summary>
public class WfcService
{
    private readonly Random _random = new();
    private static readonly Tag FloorTag = new("Floor");
    private static readonly Tag WallTag = new("Wall");

    /// <summary>
    /// Generates a new map based on the provided dimensions.
    /// </summary>
    public MapData Generate(int width, int height)
    {
        var map = new MapData(width, height);

        // TODO: Implement real WFC algorithm.
        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                var tag = _random.Next(2) == 0 ? FloorTag : WallTag;
                map[x, y] = new MapTile(tag);
            }
        }

        return map;
    }
}
