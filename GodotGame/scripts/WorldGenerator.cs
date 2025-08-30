using Godot;
using CoreLogic.Generation;
using CoreLogic.Tagging;
using CoreLogic.Plugins;

namespace GodotGame.Scripts;

public partial class WorldGenerator : Node
{
    [Export] public int MapWidth { get; set; } = 20;
    [Export] public int MapHeight { get; set; } = 20;
    [Export] public TileSetData? TileSetData { get; set; }

    private TagService _tagService = new();
    private WfcSolver _wfcSolver = new();
    private readonly List<IMapRulesetPlugin> _rulesetPlugins = new();
    private readonly List<IEnrichmentPlugin> _enrichmentPlugins = new();

    public override void _Ready()
    {
        SetupSolver();
    }

    private void SetupSolver()
    {
        // Add the tag adjacency constraint
        _wfcSolver.AddConstraint(new TagAdjacencyConstraint(_tagService));
    }

    public void AddRulesetPlugin(IMapRulesetPlugin plugin)
    {
        _rulesetPlugins.Add(plugin);
        plugin.RegisterTags(_tagService);
    }

    public void AddEnrichmentPlugin(IEnrichmentPlugin plugin)
    {
        _enrichmentPlugins.Add(plugin);
    }

    public WfcGrid? GenerateMap()
    {
        if (TileSetData == null || !TileSetData.IsValidTileSet())
        {
            GD.PrintErr("Invalid or missing TileSetData");
            return null;
        }

        // Create the grid with available tiles
        var availableTiles = TileSetData.Tiles.Cast<CoreLogic.Tagging.ITaggable>();
        var grid = new WfcGrid(MapWidth, MapHeight, availableTiles);

        // TODO: Place seed tiles

        // Solve the WFC
        if (!_wfcSolver.Solve(grid))
        {
            GD.PrintErr("Failed to generate map");
            return null;
        }

        // Apply enrichment plugins
        foreach (var plugin in _enrichmentPlugins)
        {
            plugin.EnrichMap(grid);
        }

        return grid;
    }
}