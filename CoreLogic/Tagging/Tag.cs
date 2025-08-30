namespace CoreLogic.Tagging;

public class Tag : IEquatable<Tag>
{
    public string Name { get; }

    public Tag(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tag name cannot be null or empty", nameof(name));
        
        Name = name.Trim().ToLowerInvariant();
    }

    public bool Equals(Tag? other)
    {
        return other is not null && Name == other.Name;
    }

    public override bool Equals(object? obj)
    {
        return Equals(obj as Tag);
    }

    public override int GetHashCode()
    {
        return Name.GetHashCode();
    }

    public override string ToString()
    {
        return Name;
    }

    public static bool operator ==(Tag? left, Tag? right)
    {
        if (ReferenceEquals(left, right)) return true;
        if (left is null || right is null) return false;
        return left.Equals(right);
    }

    public static bool operator !=(Tag? left, Tag? right)
    {
        return !(left == right);
    }
}