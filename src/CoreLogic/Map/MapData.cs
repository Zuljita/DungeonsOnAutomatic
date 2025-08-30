using System.Collections.Generic;

namespace DungeonsOnAutomatic.CoreLogic.Map;

/// <summary>
/// Primary data structures describing a generated map.
/// TODO: Support multiple layers and metadata.
/// </summary>
public class MapData
{
    private readonly MapTile[,] _tiles;

    public int Width { get; }
    public int Height { get; }

    public MapData(int width, int height)
    {
        Width = width;
        Height = height;
        _tiles = new MapTile[width, height];
    }

    public MapTile this[int x, int y]
    {
        get => _tiles[x, y];
        set => _tiles[x, y] = value;
    }

    public IEnumerable<MapTile> AllTiles()
    {
        for (int y = 0; y < Height; y++)
        {
            for (int x = 0; x < Width; x++)
            {
                yield return _tiles[x, y];
            }
        }
    }
}

/// <summary>
/// Simple tile representation with a tag identifier.
/// </summary>
public class MapTile
{
    /// <summary>
    /// High level category for the tile such as Floor or Wall.
    /// TODO: Expand to support multiple tags and properties.
    /// </summary>
    public string Tag { get; set; } = string.Empty;
}
