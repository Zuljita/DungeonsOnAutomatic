using System.Collections.Generic;
using System.Linq;
using DungeonsOnAutomatic.CoreLogic.Tagging;

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
                var tile = _tiles[x, y];
                if (tile != null)
                {
                    yield return tile;
                }
            }
        }
    }
}

/// <summary>
/// Simple tile representation with tags and properties.
/// </summary>
public class MapTile : ITaggable
{
    private readonly HashSet<Tag> _tags = new();
    private Tag _primaryTag;

    /// <summary>
    /// Primary tag for the tile. Always deterministic regardless of additional tags.
    /// Setting this will replace all existing tags with this single tag.
    /// </summary>
    public Tag PrimaryTag 
    { 
        get => _primaryTag;
        set 
        {
            _tags.Clear();
            _primaryTag = value;
            if (!string.IsNullOrEmpty(value.Name))
            {
                _tags.Add(value);
            }
        }
    }

    /// <summary>
    /// All tags associated with this tile.
    /// </summary>
    public IReadOnlyCollection<Tag> Tags => new HashSet<Tag>(_tags);

    public MapTile(Tag primaryTag)
    {
        _primaryTag = primaryTag;
        if (!string.IsNullOrEmpty(primaryTag.Name))
        {
            _tags.Add(primaryTag);
        }
    }

    public MapTile() : this(new Tag("empty")) { }

    public bool HasTag(Tag tag) => _tags.Contains(tag);

    public bool HasAnyTag(IEnumerable<Tag> tags) => tags.Any(tag => _tags.Contains(tag));

    public bool HasAllTags(IEnumerable<Tag> tags) => tags.All(tag => _tags.Contains(tag));

    public void AddTag(Tag tag)
    {
        _tags.Add(tag);
    }

    public void RemoveTag(Tag tag) 
    {
        if (tag.Equals(_primaryTag))
        {
            throw new InvalidOperationException("Cannot remove the primary tag. Set a new PrimaryTag instead.");
        }
        _tags.Remove(tag);
    }
}
