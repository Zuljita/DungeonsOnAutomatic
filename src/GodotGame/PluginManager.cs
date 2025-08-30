using System.Collections.Generic;
using DungeonsOnAutomatic.CoreLogic.Plugins;

namespace DungeonsOnAutomatic.GodotGame
{
    public class PluginManager
    {
        public List<IMapRulesetPlugin> RulesetPlugins { get; } = new();
        public List<IEnrichmentPlugin> EnrichmentPlugins { get; } = new();

        public void RegisterRulesetPlugin(IMapRulesetPlugin plugin)
        {
            RulesetPlugins.Add(plugin);
        }

        public void RegisterEnrichmentPlugin(IEnrichmentPlugin plugin)
        {
            EnrichmentPlugins.Add(plugin);
        }
    }
}
