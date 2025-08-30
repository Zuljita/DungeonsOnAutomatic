using System;
using System.Collections.Generic;
using System.Linq;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using DungeonsOnAutomatic.CoreLogic.Resources;

namespace DungeonsOnAutomatic.CoreLogic.Generation;

/// <summary>
/// Wave Function Collapse service using the complete constraint-based solver.
/// Generates maps based on tile sets and tag relationships.
/// </summary>
public class WfcService
{
    private readonly Random _random;
    private readonly TagService _tagService;

    public WfcService(TagService tagService, Random? random = null)
    {
        _tagService = tagService;
        _random = random ?? new Random();
    }

    /// <summary>
    /// Generates a map using the WFC algorithm with the provided tileset.
    /// </summary>
    public MapData Generate(int width, int height, TileSetData tileSet, params (int x, int y, TileData tile)[] seedTiles)
    {
        // Initialize the WFC grid
        var grid = new WfcGrid(width, height, tileSet.Tiles, _random);

        // Add tag adjacency constraint
        var tagConstraint = new TagAdjacencyConstraint(_tagService);
        grid.AddConstraint(tagConstraint);

        // Add seed constraint if seeds provided
        if (seedTiles.Any())
        {
            var seedConstraint = new SeedConstraint(seedTiles);
            grid.AddConstraint(seedConstraint);
        }

        // Generate the map
        var success = grid.Generate();

        if (!success)
        {
            throw new InvalidOperationException("WFC generation failed - could not satisfy all constraints");
        }

        return grid.ToMapData();
    }

    /// <summary>
    /// Generates a simple map for testing with basic floor/wall tiles.
    /// </summary>
    public MapData GenerateSimple(int width, int height)
    {
        // Create a simple tileset
        var tileSet = CreateSimpleTileSet();
        
        // Set up basic antagonisms
        _tagService.AddAntagonism(new Tag("Wall"), new Tag("Floor"));

        return Generate(width, height, tileSet);
    }

    private TileSetData CreateSimpleTileSet()
    {
        var tileSet = new TileSetData("Simple")
        {
            Description = "Basic floor and wall tiles for testing"
        };

        var floorTile = new TileData("Floor", new Tag("Floor"))
        {
            Weight = 3.0f // Prefer floors over walls
        };

        var wallTile = new TileData("Wall", new Tag("Wall"))
        {
            Weight = 1.0f
        };

        tileSet.AddTile(floorTile);
        tileSet.AddTile(wallTile);
        tileSet.InitializeTagRelationships();

        return tileSet;
    }
}
