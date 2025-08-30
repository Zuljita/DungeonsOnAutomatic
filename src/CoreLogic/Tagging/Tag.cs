using System;

namespace DungeonsOnAutomatic.CoreLogic.Tagging;

/// <summary>
/// Represents a semantic tag that can be applied to game objects.
/// Tags are immutable and identified by their name.
/// </summary>
public readonly struct Tag : IEquatable<Tag>
{
    public string Name { get; }

    public Tag(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tag name cannot be null, empty, or whitespace.", nameof(name));
        
        Name = name.Trim();
    }

    /// <summary>
    /// Creates a new Tag from a string name. Explicit alternative to implicit conversion.
    /// </summary>
    public static Tag Create(string name) => new(name);

    /// <summary>
    /// Attempts to create a Tag from a string, returning false if name is null, empty, or whitespace.
    /// </summary>
    public static bool TryCreate(string? name, out Tag tag)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            tag = default;
            return false;
        }
        tag = new Tag(name);
        return true;
    }

    public bool Equals(Tag other) => Name == other.Name;

    public override bool Equals(object? obj) => obj is Tag other && Equals(other);

    public override int GetHashCode() => Name?.GetHashCode() ?? 0;

    public override string ToString() => Name;

    public static bool operator ==(Tag left, Tag right) => left.Equals(right);
    
    public static bool operator !=(Tag left, Tag right) => !left.Equals(right);

    public static implicit operator string(Tag tag) => tag.Name;
    
    public static implicit operator Tag(string name) => new(name);
}