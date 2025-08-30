using System.Linq;
using Xunit;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using DungeonsOnAutomatic.GodotGame.Resources;

namespace CoreLogic.Tests.Resources;

public class TileSetDataTests
{
    [Fact]
    public void Constructor_SetsDefaultValues()
    {
        var tileSet = new TileSetData();
        
        Assert.Equal("Unnamed Tileset", tileSet.Name);
        Assert.Empty(tileSet.Tiles);
        Assert.NotNull(tileSet.TagService);
    }

    [Fact]
    public void Constructor_WithName_SetsNameCorrectly()
    {
        var tileSet = new TileSetData("Dungeon Tiles");
        
        Assert.Equal("Dungeon Tiles", tileSet.Name);
    }

    [Fact]
    public void AddTile_AddsTileSuccessfully()
    {
        var tileSet = new TileSetData();
        var tile = new TileData("Wall", new Tag("Wall"));
        
        tileSet.AddTile(tile);
        
        Assert.Single(tileSet.Tiles);
        Assert.Contains(tile, tileSet.Tiles);
    }

    [Fact]
    public void AddTile_DoesNotAddDuplicates()
    {
        var tileSet = new TileSetData();
        var tile = new TileData("Wall", new Tag("Wall"));
        
        tileSet.AddTile(tile);
        tileSet.AddTile(tile);
        
        Assert.Single(tileSet.Tiles);
    }

    [Fact]
    public void RemoveTile_RemovesTileSuccessfully()
    {
        var tileSet = new TileSetData();
        var tile = new TileData("Wall", new Tag("Wall"));
        
        tileSet.AddTile(tile);
        tileSet.RemoveTile(tile);
        
        Assert.Empty(tileSet.Tiles);
    }

    [Fact]
    public void GetTilesWithTag_ReturnsCorrectTiles()
    {
        var tileSet = new TileSetData();
        var wallTag = new Tag("Wall");
        var floorTag = new Tag("Floor");
        
        var wallTile = new TileData("Wall", wallTag);
        var floorTile = new TileData("Floor", floorTag);
        var doorTile = new TileData("Door", wallTag, floorTag);
        
        tileSet.AddTile(wallTile);
        tileSet.AddTile(floorTile);
        tileSet.AddTile(doorTile);
        
        var wallTiles = tileSet.GetTilesWithTag(wallTag).ToList();
        
        Assert.Equal(2, wallTiles.Count);
        Assert.Contains(wallTile, wallTiles);
        Assert.Contains(doorTile, wallTiles);
    }

    [Fact]
    public void GetTilesWithAnyTag_ReturnsCorrectTiles()
    {
        var tileSet = new TileSetData();
        var wallTag = new Tag("Wall");
        var floorTag = new Tag("Floor");
        var waterTag = new Tag("Water");
        
        var wallTile = new TileData("Wall", wallTag);
        var floorTile = new TileData("Floor", floorTag);
        var waterTile = new TileData("Water", waterTag);
        
        tileSet.AddTile(wallTile);
        tileSet.AddTile(floorTile);
        tileSet.AddTile(waterTile);
        
        var solidTiles = tileSet.GetTilesWithAnyTag(new[] { wallTag, floorTag }).ToList();
        
        Assert.Equal(2, solidTiles.Count);
        Assert.Contains(wallTile, solidTiles);
        Assert.Contains(floorTile, solidTiles);
    }

    [Fact]
    public void GetSeedTiles_ReturnsOnlySeedTiles()
    {
        var tileSet = new TileSetData();
        var seedTile = new TileData("Seed", new Tag("Wall")) { CanBeSeed = true };
        var nonSeedTile = new TileData("NonSeed", new Tag("Floor")) { CanBeSeed = false };
        
        tileSet.AddTile(seedTile);
        tileSet.AddTile(nonSeedTile);
        
        var seedTiles = tileSet.GetSeedTiles().ToList();
        
        Assert.Single(seedTiles);
        Assert.Contains(seedTile, seedTiles);
    }

    [Fact]
    public void GetAllTags_ReturnsUniqueTagsFromAllTiles()
    {
        var tileSet = new TileSetData();
        var wallTag = new Tag("Wall");
        var floorTag = new Tag("Floor");
        var stoneTag = new Tag("Stone");
        
        var wallTile = new TileData("Wall", wallTag, stoneTag);
        var floorTile = new TileData("Floor", floorTag);
        var stoneWallTile = new TileData("Stone Wall", wallTag, stoneTag); // Duplicate tags
        
        tileSet.AddTile(wallTile);
        tileSet.AddTile(floorTile);
        tileSet.AddTile(stoneWallTile);
        
        var allTags = tileSet.GetAllTags().ToList();
        
        Assert.Equal(3, allTags.Count);
        Assert.Contains(wallTag, allTags);
        Assert.Contains(floorTag, allTags);
        Assert.Contains(stoneTag, allTags);
    }

    [Fact]
    public void GetRandomTileWithTag_ReturnsValidTile()
    {
        var tileSet = new TileSetData();
        var wallTag = new Tag("Wall");
        var wallTile1 = new TileData("Wall1", wallTag) { Weight = 1.0f };
        var wallTile2 = new TileData("Wall2", wallTag) { Weight = 1.0f };
        
        tileSet.AddTile(wallTile1);
        tileSet.AddTile(wallTile2);
        
        var random = new System.Random(42); // Fixed seed for deterministic test
        var result = tileSet.GetRandomTileWithTag(wallTag, random);
        
        Assert.NotNull(result);
        Assert.True(result == wallTile1 || result == wallTile2);
    }

    [Fact]
    public void GetRandomTileWithTag_WithNoMatchingTiles_ReturnsNull()
    {
        var tileSet = new TileSetData();
        var wallTag = new Tag("Wall");
        
        var result = tileSet.GetRandomTileWithTag(wallTag);
        
        Assert.Null(result);
    }

    [Fact]
    public void ValidateTileSet_WithValidTileSet_ReturnsNoIssues()
    {
        var tileSet = new TileSetData("Valid Set");
        var tile = new TileData("Wall", new Tag("Wall"));
        tileSet.AddTile(tile);
        
        var issues = tileSet.ValidateTileSet();
        
        Assert.Empty(issues);
    }

    [Fact]
    public void ValidateTileSet_WithIssues_ReturnsCorrectIssues()
    {
        var tileSet = new TileSetData(""); // Empty name
        var tileWithoutTags = new TileData("NoTags");
        var tile1 = new TileData("Duplicate", new Tag("Wall"));
        var tile2 = new TileData("Duplicate", new Tag("Floor")); // Duplicate name
        
        tileSet.AddTile(tileWithoutTags);
        tileSet.AddTile(tile1);
        tileSet.AddTile(tile2);
        
        var issues = tileSet.ValidateTileSet();
        
        Assert.Contains(issues, issue => issue.Contains("name is empty"));
        Assert.Contains(issues, issue => issue.Contains("have no tags"));
        Assert.Contains(issues, issue => issue.Contains("Duplicate tile names"));
    }

    [Fact]
    public void InitializeTagRelationships_SetsUpTagService()
    {
        var tileSet = new TileSetData();
        var wallTile = new TileData("Wall", new Tag("Wall"));
        var floorTile = new TileData("Floor", new Tag("Floor"));
        
        tileSet.AddTile(wallTile);
        tileSet.AddTile(floorTile);
        
        tileSet.InitializeTagRelationships();
        
        // Should set up default Wall-Floor antagonism
        Assert.False(tileSet.TagService.AreCompatible(new Tag("Wall"), new Tag("Floor")));
    }

    [Fact]
    public void ToString_ReturnsFormattedString()
    {
        var tileSet = new TileSetData("Test Set");
        tileSet.AddTile(new TileData("Wall", new Tag("Wall")));
        tileSet.AddTile(new TileData("Floor", new Tag("Floor")));
        
        var result = tileSet.ToString();
        
        Assert.Contains("Test Set", result);
        Assert.Contains("2 tiles", result);
    }
}