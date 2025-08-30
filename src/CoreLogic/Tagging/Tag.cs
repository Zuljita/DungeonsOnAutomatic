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
        Name = name ?? throw new ArgumentNullException(nameof(name));
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