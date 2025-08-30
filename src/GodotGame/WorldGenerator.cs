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
            _pluginManager.RegisterEnrichmentPlugin(new ExitPlacementEnrichmentPlugin());

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
            var rawSeeds = ruleset.GetSeeds();

            // Clamp/adjust seeds to current dimensions to avoid OOB when Width/Height < 11, etc.
            var seeds = rawSeeds
                .Select(s => (
                    x: Mathf.Clamp(s.x, 0, Width - 1),
                    y: Mathf.Clamp(s.y, 0, Height - 1),
                    tile: s.tile
                ))
                // Deduplicate by position to avoid multiple seeds after clamping
                .GroupBy(s => (s.x, s.y))
                .Select(g => g.First())
                .ToArray();

            // Generate the map
            var mapData = _wfcService.Generate(Width, Height, tileSet, seeds);

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
