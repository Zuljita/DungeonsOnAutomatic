using System.Collections.Generic;

namespace DungeonsOnAutomatic.CoreLogic.Tagging;

/// <summary>
/// Simple tag container that tracks affinities and antagonisms.
/// TODO: Flesh out serialization and conflict resolution rules.
/// </summary>
public class TaggingSystem
{
    private readonly Dictionary<string, HashSet<string>> _affinities = new();
    private readonly Dictionary<string, HashSet<string>> _antagonisms = new();

    /// <summary>
    /// Registers that <paramref name="tag"/> has an affinity with <paramref name="other"/>.
    /// </summary>
    public void AddAffinity(string tag, string other)
    {
        if (!_affinities.TryGetValue(tag, out var set))
        {
            set = new HashSet<string>();
            _affinities[tag] = set;
        }

        set.Add(other);
    }

    /// <summary>
    /// Registers that <paramref name="tag"/> is antagonistic with <paramref name="other"/>.
    /// </summary>
    public void AddAntagonism(string tag, string other)
    {
        if (!_antagonisms.TryGetValue(tag, out var set))
        {
            set = new HashSet<string>();
            _antagonisms[tag] = set;
        }

        set.Add(other);
    }

    /// <summary>
    /// Checks if <paramref name="tag"/> and <paramref name="other"/> are considered compatible.
    /// Currently only ensures they are not antagonistic.
    /// TODO: Add affinity scoring once generation uses weights.
    /// </summary>
    public bool AreCompatible(string tag, string other)
    {
        return !_antagonisms.TryGetValue(tag, out var set) || !set.Contains(other);
    }
}
