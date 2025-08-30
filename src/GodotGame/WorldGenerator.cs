using Godot;
using DungeonsOnAutomatic.CoreLogic.Generation;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using DungeonsOnAutomatic.GodotGame.Plugins;
using DungeonsOnAutomatic.GodotGame.Godot;
using System.Linq;

namespace DungeonsOnAutomatic.GodotGame
{
    public partial class WorldGenerator : Node
    {
        [Export]
        public MapRenderer MapRenderer { get; set; }

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
            _pluginManager.RegisterEnrichmentPlugin(new FarthestTreasureEnrichmentPlugin());

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
            var mapData = _wfcService.Generate(Width, Height, tileSet, seeds.ToArray());

            // Enrichment pass
            foreach (var plugin in _pluginManager.EnrichmentPlugins)
            {
                plugin.Enrich(mapData);
            }

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

        [Export]
        public int Width { get; set; } = 20;

        [Export]
        public int Height { get; set; } = 20;

        public override void _UnhandledInput(InputEvent @event)
        {
            if (@event is InputEventKey k && k.Pressed && !k.Echo)
            {
                // R to regenerate
                if (k.Keycode == Key.R)
                {
                    Generate();
                }
            }
        }
    }
}
