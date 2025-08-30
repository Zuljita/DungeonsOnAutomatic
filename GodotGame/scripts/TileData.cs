using Godot;
using CoreLogic.Tagging;

namespace GodotGame.Scripts;

[GlobalClass]
public partial class TileData : Resource, ITaggable
{
    [Export] public string TileName { get; set; } = string.Empty;
    [Export] public Texture2D? Texture { get; set; }
    [Export] public string[] TagNames { get; set; } = Array.Empty<string>();

    private List<Tag>? _tags;

    public IReadOnlyCollection<Tag> Tags
    {
        get
        {
            if (_tags == null)
            {
                _tags = TagNames.Select(name => new Tag(name)).ToList();
            }
            return _tags;
        }
    }

    public void UpdateTags(IEnumerable<string> tagNames)
    {
        TagNames = tagNames.ToArray();
        _tags = null; // Force regeneration
    }

    public bool HasTag(string tagName)
    {
        return Tags.Any(t => t.Name == tagName.ToLowerInvariant());
    }
}