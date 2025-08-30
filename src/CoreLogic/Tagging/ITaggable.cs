using System.Collections.Generic;

namespace DungeonsOnAutomatic.CoreLogic.Tagging;

/// <summary>
/// Interface for objects that can have tags applied to them.
/// </summary>
public interface ITaggable
{
    /// <summary>
    /// Gets all tags associated with this object.
    /// </summary>
    IReadOnlyCollection<Tag> Tags { get; }

    /// <summary>
    /// Checks if this object has the specified tag.
    /// </summary>
    bool HasTag(Tag tag);

    /// <summary>
    /// Checks if this object has any of the specified tags.
    /// </summary>
    bool HasAnyTag(IEnumerable<Tag> tags);

    /// <summary>
    /// Checks if this object has all of the specified tags.
    /// </summary>
    bool HasAllTags(IEnumerable<Tag> tags);
}