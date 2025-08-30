using System;
using DungeonsOnAutomatic.CoreLogic.Map;

namespace DungeonsOnAutomatic.CoreLogic.Generation;

/// <summary>
/// Basic scaffold for the Wave Function Collapse solver.
/// TODO: Replace random filler with actual constraint propagation.
/// </summary>
public class WfcService
{
    private readonly Random _random = new();

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
                map[x, y] = new MapTile { Tag = _random.Next(2) == 0 ? "Floor" : "Wall" };
            }
        }

        return map;
    }
}
