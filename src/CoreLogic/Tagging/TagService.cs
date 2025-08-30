using System.Collections.Generic;

namespace DungeonsOnAutomatic.CoreLogic.Tagging;

/// <summary>
/// Service for managing tag relationships (affinities and antagonisms).
/// Handles symmetric relationship management automatically.
/// </summary>
public class TagService
{
    private readonly Dictionary<Tag, HashSet<Tag>> _affinities = new();
    private readonly Dictionary<Tag, HashSet<Tag>> _antagonisms = new();

    /// <summary>
    /// Registers a symmetric affinity between two tags.
    /// Both tags will have affinity with each other.
    /// </summary>
    public void AddAffinity(Tag tag1, Tag tag2)
    {
        AddAffinityOneWay(tag1, tag2);
        AddAffinityOneWay(tag2, tag1);
    }

    /// <summary>
    /// Registers a symmetric antagonism between two tags.
    /// Both tags will be antagonistic with each other.
    /// </summary>
    public void AddAntagonism(Tag tag1, Tag tag2)
    {
        AddAntagonismOneWay(tag1, tag2);
        AddAntagonismOneWay(tag2, tag1);
    }

    /// <summary>
    /// Checks if two tags are compatible (not antagonistic).
    /// </summary>
    public bool AreCompatible(Tag tag1, Tag tag2)
    {
        return !_antagonisms.TryGetValue(tag1, out var antagonists) || !antagonists.Contains(tag2);
    }

    /// <summary>
    /// Checks if two tags have an affinity relationship.
    /// </summary>
    public bool HaveAffinity(Tag tag1, Tag tag2)
    {
        return _affinities.TryGetValue(tag1, out var affinities) && affinities.Contains(tag2);
    }

    /// <summary>
    /// Gets all tags that have affinity with the specified tag.
    /// </summary>
    public IReadOnlySet<Tag> GetAffinities(Tag tag)
    {
        return _affinities.TryGetValue(tag, out var affinities) 
            ? new HashSet<Tag>(affinities) 
            : new HashSet<Tag>();
    }

    /// <summary>
    /// Gets all tags that are antagonistic with the specified tag.
    /// </summary>
    public IReadOnlySet<Tag> GetAntagonisms(Tag tag)
    {
        return _antagonisms.TryGetValue(tag, out var antagonisms) 
            ? new HashSet<Tag>(antagonisms) 
            : new HashSet<Tag>();
    }

    private void AddRelationshipOneWay(Tag from, Tag to, Dictionary<Tag, HashSet<Tag>> relationships)
    {
        if (!relationships.TryGetValue(from, out var set))
        {
            set = new HashSet<Tag>();
            relationships[from] = set;
        }
        set.Add(to);
    }

    private void AddAffinityOneWay(Tag from, Tag to)
    {
        AddRelationshipOneWay(from, to, _affinities);
    }

    private void AddAntagonismOneWay(Tag from, Tag to)
    {
        AddRelationshipOneWay(from, to, _antagonisms);
    }
}
