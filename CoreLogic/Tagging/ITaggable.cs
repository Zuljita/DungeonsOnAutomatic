namespace CoreLogic.Tagging;

public interface ITaggable
{
    IReadOnlyCollection<Tag> Tags { get; }
}