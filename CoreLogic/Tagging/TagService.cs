namespace CoreLogic.Tagging;

public class TagService
{
    private readonly List<TagRelation> _relations = new();

    public void AddAffinity(Tag tag1, Tag tag2)
    {
        if (tag1 == tag2)
            throw new ArgumentException("A tag cannot have a relationship with itself");

        RemoveExistingRelation(tag1, tag2);
        _relations.Add(new TagRelation(tag1, tag2, TagRelationType.Affinity));
    }

    public void AddAntagonism(Tag tag1, Tag tag2)
    {
        if (tag1 == tag2)
            throw new ArgumentException("A tag cannot have a relationship with itself");

        RemoveExistingRelation(tag1, tag2);
        _relations.Add(new TagRelation(tag1, tag2, TagRelationType.Antagonism));
    }

    public bool HasAffinity(Tag tag1, Tag tag2)
    {
        return GetRelation(tag1, tag2)?.Type == TagRelationType.Affinity;
    }

    public bool HasAntagonism(Tag tag1, Tag tag2)
    {
        return GetRelation(tag1, tag2)?.Type == TagRelationType.Antagonism;
    }

    public IEnumerable<Tag> GetAffinityTags(Tag tag)
    {
        return _relations
            .Where(r => r.Type == TagRelationType.Affinity && r.InvolvesTag(tag))
            .Select(r => r.GetOtherTag(tag)!)
            .Where(t => t != null);
    }

    public IEnumerable<Tag> GetAntagonismTags(Tag tag)
    {
        return _relations
            .Where(r => r.Type == TagRelationType.Antagonism && r.InvolvesTag(tag))
            .Select(r => r.GetOtherTag(tag)!)
            .Where(t => t != null);
    }

    public bool CanBeAdjacent(ITaggable item1, ITaggable item2)
    {
        foreach (var tag1 in item1.Tags)
        {
            foreach (var tag2 in item2.Tags)
            {
                if (HasAntagonism(tag1, tag2))
                    return false;
            }
        }
        return true;
    }

    public double CalculateAffinity(ITaggable item1, ITaggable item2)
    {
        double affinityScore = 0;

        foreach (var tag1 in item1.Tags)
        {
            foreach (var tag2 in item2.Tags)
            {
                if (HasAffinity(tag1, tag2))
                    affinityScore += 1.0;
            }
        }

        return affinityScore;
    }

    private TagRelation? GetRelation(Tag tag1, Tag tag2)
    {
        return _relations.FirstOrDefault(r => 
            (r.Tag1 == tag1 && r.Tag2 == tag2) || 
            (r.Tag1 == tag2 && r.Tag2 == tag1));
    }

    private void RemoveExistingRelation(Tag tag1, Tag tag2)
    {
        var existing = GetRelation(tag1, tag2);
        if (existing != null)
        {
            _relations.Remove(existing);
        }
    }
}