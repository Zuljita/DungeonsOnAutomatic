using Godot;
using System.Collections.Generic;
using System.Linq;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace DungeonsOnAutomatic.GodotGame.Resources;

/// <summary>
/// Godot Resource representing a collection of tile definitions and their relationships.
/// Acts as a content pack for map generation with editor integration.
/// </summary>
[GlobalClass]
public partial class TileSetData : Resource
{
    [Export]
    public string Name { get; set; } = string.Empty;

    [Export]
    public string Description { get; set; } = string.Empty;

    [Export]
    public string Author { get; set; } = string.Empty;

    [Export]
    public string Version { get; set; } = "1.0";

    /// <summary>
    /// All tile definitions in this set.
    /// </summary>
    [Export]
    public Godot.Collections.Array<TileData> Tiles { get; set; } = new();

    /// <summary>
    /// TagService for managing relationships between tags in this tileset.
    /// Note: This is initialized at runtime, not serialized.
    /// </summary>
    public TagService TagService { get; private set; } = new();

    public TileSetData()
    {
        Name = "Unnamed Tileset";
    }

    public TileSetData(string name) : this()
    {
        Name = name;
    }

    /// <summary>
    /// Initialize the TagService with predefined relationships.
    /// Call this after loading the resource or setting up tiles.
    /// </summary>
    public void InitializeTagRelationships()
    {
        TagService = new TagService();
        
        // Add default relationships that make sense for most tilesets
        SetupDefaultTagRelationships();
        
        // Allow subclasses or external code to add custom relationships
        SetupCustomTagRelationships();
    }

    /// <summary>
    /// Sets up common tag relationships that apply to most tilesets.
    /// Override this method to customize default relationships.
    /// </summary>
    protected virtual void SetupDefaultTagRelationships()
    {
        // Example default relationships - can be overridden
        if (HasTagInSet("Wall") && HasTagInSet("Floor"))
        {
            TagService.AddAntagonism(new Tag("Wall"), new Tag("Floor"));
        }

        if (HasTagInSet("Water") && HasTagInSet("Fire"))
        {
            TagService.AddAntagonism(new Tag("Water"), new Tag("Fire"));
        }

        if (HasTagInSet("Stone") && HasTagInSet("Wall"))
        {
            TagService.AddAffinity(new Tag("Stone"), new Tag("Wall"));
        }
    }

    /// <summary>
    /// Override this method to add custom tag relationships specific to your tileset.
    /// </summary>
    protected virtual void SetupCustomTagRelationships()
    {
        // Override in derived classes or set up externally
    }

    /// <summary>
    /// Add a tile to this set.
    /// </summary>
    public void AddTile(TileData tile)
    {
        if (tile != null && !Tiles.Contains(tile))
        {
            Tiles.Add(tile);
        }
    }

    /// <summary>
    /// Remove a tile from this set.
    /// </summary>
    public void RemoveTile(TileData tile)
    {
        Tiles.Remove(tile);
    }

    /// <summary>
    /// Get all tiles that have a specific tag.
    /// </summary>
    public IEnumerable<TileData> GetTilesWithTag(Tag tag)
    {
        return Tiles.Where(tile => tile.HasTag(tag));
    }

    /// <summary>
    /// Get all tiles that have any of the specified tags.
    /// </summary>
    public IEnumerable<TileData> GetTilesWithAnyTag(IEnumerable<Tag> tags)
    {
        return Tiles.Where(tile => tile.HasAnyTag(tags));
    }

    /// <summary>
    /// Get all tiles that can be used as seeds.
    /// </summary>
    public IEnumerable<TileData> GetSeedTiles()
    {
        return Tiles.Where(tile => tile.CanBeSeed);
    }

    /// <summary>
    /// Get all unique tags used across all tiles in this set.
    /// </summary>
    public IEnumerable<Tag> GetAllTags()
    {
        return Tiles.SelectMany(tile => tile.Tags).Distinct();
    }

    /// <summary>
    /// Check if any tile in this set has the specified tag.
    /// </summary>
    public bool HasTagInSet(string tagName)
    {
        return Tag.TryCreate(tagName, out var tag) && Tiles.Any(tile => tile.HasTag(tag));
    }

    /// <summary>
    /// Get a random tile with the specified tag, considering weights.
    /// </summary>
    public TileData? GetRandomTileWithTag(Tag tag, System.Random? random = null)
    {
        var candidates = GetTilesWithTag(tag).ToList();
        if (!candidates.Any()) return null;

        random ??= new System.Random();

        // Simple weighted selection
        var totalWeight = candidates.Sum(t => t.Weight);
        var randomValue = (float)random.NextDouble() * totalWeight;

        float currentWeight = 0;
        foreach (var tile in candidates)
        {
            currentWeight += tile.Weight;
            if (randomValue <= currentWeight)
            {
                return tile;
            }
        }

        // Fallback to last tile if rounding issues  
        return candidates.LastOrDefault();
    }

    /// <summary>
    /// Validate the tileset for common issues.
    /// </summary>
    public List<string> ValidateTileSet()
    {
        var issues = new List<string>();

        if (string.IsNullOrWhiteSpace(Name))
        {
            issues.Add("TileSet name is empty");
        }

        if (!Tiles.Any())
        {
            issues.Add("TileSet contains no tiles");
        }

        var tilesWithoutTags = Tiles.Where(t => !t.Tags.Any()).ToList();
        if (tilesWithoutTags.Any())
        {
            issues.Add($"{tilesWithoutTags.Count} tile(s) have no tags");
        }

        var duplicateNames = Tiles.GroupBy(t => t.Name)
                                  .Where(g => g.Count() > 1)
                                  .Select(g => g.Key)
                                  .ToList();
        if (duplicateNames.Any())
        {
            issues.Add($"Duplicate tile names: {string.Join(", ", duplicateNames)}");
        }

        return issues;
    }

    public override string ToString() => $"TileSetData: {Name} ({Tiles.Count} tiles)";
}