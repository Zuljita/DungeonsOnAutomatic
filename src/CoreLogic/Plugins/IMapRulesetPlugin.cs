using DungeonsOnAutomatic.CoreLogic.Resources;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using System.Collections.Generic;

namespace DungeonsOnAutomatic.CoreLogic.Plugins
{
    public interface IMapRulesetPlugin
    {
        string Name { get; }
        string Description { get; }

        void RegisterTags(TagService tagService);
        TileSetData GetTileSet();
        IEnumerable<(int x, int y, TileData tile)> GetSeeds();
    }
}
