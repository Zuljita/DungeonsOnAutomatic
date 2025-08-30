using Godot;
using System.Collections.Generic;
using System.Linq;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace DungeonsOnAutomatic.GodotGame.Resources;

/// <summary>
/// Godot Resource representing a single tile definition with tags and visual properties.
/// Designed for use in the Godot editor with full inspector integration.
/// </summary>
[GlobalClass]
public partial class TileData : Resource, ITaggable
{
    private readonly HashSet<Tag> _tags = new();
    private Tag _primaryTag = new("undefined");

    [Export]
    public string Name { get; set; } = string.Empty;

    [Export]
    public string Description { get; set; } = string.Empty;

    [Export]
    public Texture2D? Texture { get; set; }

    [Export]
    public Color Color { get; set; } = Colors.White;

    /// <summary>
    /// String array for editor compatibility. Use Tags property in code.
    /// First tag in array becomes the primary tag.
    /// </summary>
    [Export]
    public string[] TagNames
    {
        get => new[] { _primaryTag.Name }.Concat(_tags.Where(t => !t.Equals(_primaryTag)).Select(t => t.Name)).ToArray();
        set
        {
            _tags.Clear();
            if (value != null && value.Length > 0)
            {
                // First tag becomes primary
                if (Tag.TryCreate(value[0], out var primaryTag))
                {
                    _primaryTag = primaryTag;
                    _tags.Add(primaryTag);
                }

                // Add remaining tags
                for (int i = 1; i < value.Length; i++)
                {
                    if (Tag.TryCreate(value[i], out var tag))
                    {
                        _tags.Add(tag);
                    }
                }
            }
            else
            {
                _primaryTag = new Tag("undefined");
                _tags.Add(_primaryTag);
            }
        }
    }

    /// <summary>
    /// Weight for generation algorithms. Higher weights are more likely to be selected.
    /// </summary>
    [Export]
    public float Weight { get; set; } = 1.0f;

    /// <summary>
    /// Whether this tile can be used as a seed (pre-placed) tile.
    /// </summary>
    [Export]
    public bool CanBeSeed { get; set; } = true;

    /// <summary>
    /// All tags associated with this tile. Use this property in code.
    /// </summary>
    public IReadOnlyCollection<Tag> Tags => new HashSet<Tag>(_tags);

    public TileData()
    {
        Name = "Unnamed Tile";
        _tags.Add(_primaryTag);
    }

    public TileData(string name, params Tag[] tags) : this()
    {
        Name = name;
        if (tags.Length > 0)
        {
            _primaryTag = tags[0];
            _tags.Clear();
            foreach (var tag in tags)
            {
                _tags.Add(tag);
            }
        }
    }

    public bool HasTag(Tag tag) => _tags.Contains(tag);

    public bool HasAnyTag(IEnumerable<Tag> tags) => tags.Any(tag => _tags.Contains(tag));

    public bool HasAllTags(IEnumerable<Tag> tags) => tags.All(tag => _tags.Contains(tag));

    /// <summary>
    /// Add a tag to this tile definition.
    /// </summary>
    public void AddTag(Tag tag)
    {
        _tags.Add(tag);
    }

    /// <summary>
    /// Remove a tag from this tile definition.
    /// </summary>
    public void RemoveTag(Tag tag)
    {
        _tags.Remove(tag);
    }

    /// <summary>
    /// Creates a MapTile instance from this tile definition.
    /// Primary tag is always deterministic.
    /// </summary>
    public CoreLogic.Map.MapTile CreateMapTile()
    {
        var mapTile = new CoreLogic.Map.MapTile(_primaryTag);
        
        // Add all additional tags (excluding primary)
        foreach (var tag in _tags.Where(t => !t.Equals(_primaryTag)))
        {
            mapTile.AddTag(tag);
        }

        return mapTile;
    }

    public override string ToString() => $"TileData: {Name} [{string.Join(", ", _tags)}]";
}