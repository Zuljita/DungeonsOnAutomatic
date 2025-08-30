using CoreLogic.Tagging;

namespace CoreLogic.Plugins;

public interface IMapRulesetPlugin
{
    string Name { get; }
    void RegisterTags(TagService tagService);
    IEnumerable<ITaggable> GetAvailableTiles();
    IEnumerable<ITaggable> GetSeedTiles();
}