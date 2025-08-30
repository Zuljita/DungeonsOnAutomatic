namespace CoreLogic.Tagging;

public enum TagRelationType
{
    Affinity,
    Antagonism
}

public class TagRelation
{
    public Tag Tag1 { get; }
    public Tag Tag2 { get; }
    public TagRelationType Type { get; }

    public TagRelation(Tag tag1, Tag tag2, TagRelationType type)
    {
        Tag1 = tag1 ?? throw new ArgumentNullException(nameof(tag1));
        Tag2 = tag2 ?? throw new ArgumentNullException(nameof(tag2));
        Type = type;
    }

    public bool InvolvesTag(Tag tag)
    {
        return Tag1 == tag || Tag2 == tag;
    }

    public Tag? GetOtherTag(Tag tag)
    {
        if (Tag1 == tag) return Tag2;
        if (Tag2 == tag) return Tag1;
        return null;
    }
}