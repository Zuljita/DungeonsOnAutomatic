using Xunit;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using DungeonsOnAutomatic.GodotGame.Resources;

namespace CoreLogic.Tests.Resources;

public class TileDataTests
{
    [Fact]
    public void Constructor_SetsDefaultValues()
    {
        var tile = new TileData();
        
        Assert.Equal("Unnamed Tile", tile.Name);
        Assert.Empty(tile.Tags);
        Assert.Equal(1.0f, tile.Weight);
        Assert.True(tile.CanBeSeed);
    }

    [Fact]
    public void Constructor_WithNameAndTags_SetsCorrectly()
    {
        var wallTag = new Tag("Wall");
        var stoneTag = new Tag("Stone");
        var tile = new TileData("Stone Wall", wallTag, stoneTag);
        
        Assert.Equal("Stone Wall", tile.Name);
        Assert.True(tile.HasTag(wallTag));
        Assert.True(tile.HasTag(stoneTag));
        Assert.Equal(2, tile.Tags.Count);
    }

    [Fact]
    public void TagNames_SetterAndGetter_WorkCorrectly()
    {
        var tile = new TileData();
        
        tile.TagNames = new[] { "Wall", "Stone", "Solid" };
        
        Assert.Equal(3, tile.TagNames.Length);
        Assert.Contains("Wall", tile.TagNames);
        Assert.Contains("Stone", tile.TagNames);
        Assert.Contains("Solid", tile.TagNames);
        Assert.True(tile.HasTag(new Tag("Wall")));
    }

    [Fact]
    public void TagNames_IgnoresInvalidNames()
    {
        var tile = new TileData();
        
        tile.TagNames = new[] { "Wall", "", "   ", "Floor" };
        
        Assert.Equal(2, tile.TagNames.Length);
        Assert.Contains("Wall", tile.TagNames);
        Assert.Contains("Floor", tile.TagNames);
    }

    [Fact]
    public void AddTag_AddsTagSuccessfully()
    {
        var tile = new TileData();
        var wallTag = new Tag("Wall");
        
        tile.AddTag(wallTag);
        
        Assert.True(tile.HasTag(wallTag));
    }

    [Fact]
    public void RemoveTag_RemovesTagSuccessfully()
    {
        var tile = new TileData("Test", new Tag("Wall"), new Tag("Stone"));
        
        tile.RemoveTag(new Tag("Stone"));
        
        Assert.True(tile.HasTag(new Tag("Wall")));
        Assert.False(tile.HasTag(new Tag("Stone")));
    }

    [Fact]
    public void CreateMapTile_CreatesCorrectMapTile()
    {
        var wallTag = new Tag("Wall");
        var stoneTag = new Tag("Stone");
        var tile = new TileData("Stone Wall", wallTag, stoneTag);
        
        var mapTile = tile.CreateMapTile();
        
        Assert.Equal(wallTag, mapTile.PrimaryTag);
        Assert.True(mapTile.HasTag(wallTag));
        Assert.True(mapTile.HasTag(stoneTag));
    }

    [Fact]
    public void CreateMapTile_WithNoTags_CreatesUndefinedTile()
    {
        var tile = new TileData("Empty");
        
        var mapTile = tile.CreateMapTile();
        
        Assert.Equal("undefined", mapTile.PrimaryTag.Name);
    }

    [Fact]
    public void Tags_ReturnsDefensiveCopy()
    {
        var tile = new TileData("Test", new Tag("Wall"));
        
        var tags1 = tile.Tags;
        var tags2 = tile.Tags;
        
        Assert.NotSame(tags1, tags2);
        Assert.Equal(tags1, tags2);
    }

    [Fact]
    public void ToString_ReturnsFormattedString()
    {
        var tile = new TileData("Stone Wall", new Tag("Wall"), new Tag("Stone"));
        
        var result = tile.ToString();
        
        Assert.Contains("Stone Wall", result);
        Assert.Contains("Wall", result);
        Assert.Contains("Stone", result);
    }
}