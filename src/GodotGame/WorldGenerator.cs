using Godot;
using DungeonsOnAutomatic.CoreLogic.Generation;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using DungeonsOnAutomatic.GodotGame.Plugins;
using System.Linq;

namespace DungeonsOnAutomatic.GodotGame
{
    public partial class WorldGenerator : Node
    {
        [Export]
        public Godot.MapRenderer MapRenderer { get; set; }

        private PluginManager _pluginManager;
        private WfcService _wfcService;
        private TagService _tagService;

        public override void _Ready()
        {
            _pluginManager = new PluginManager();
            _tagService = new TagService();
            _wfcService = new WfcService(_tagService);

            // Register plugins
            _pluginManager.RegisterRulesetPlugin(new DungeonMapPlugin());

            // Generate the world
            Generate();
        }

        private void Generate()
        {
            if (_pluginManager.RulesetPlugins.Count == 0)
            {
                GD.PrintErr("No ruleset plugins registered.");
                return;
            }

            // For now, just use the first ruleset plugin
            var ruleset = _pluginManager.RulesetPlugins[0];

            // Register tags
            ruleset.RegisterTags(_tagService);

            // Get tileset and seeds
            var tileSet = ruleset.GetTileSet();
            var seeds = ruleset.GetSeeds();

            // Generate the map
            var mapData = _wfcService.Generate(20, 20, tileSet, seeds.ToArray());

            if (MapRenderer != null)
            {
                MapRenderer.Render(mapData);
                GD.Print("Map rendered successfully!");
            }
            else
            {
                GD.PrintErr("MapRenderer not set on WorldGenerator.");
            }
        }
    }
}
