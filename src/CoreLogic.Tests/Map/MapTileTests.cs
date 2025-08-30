using System;
using Xunit;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace CoreLogic.Tests.Map;

public class MapTileTests
{
    [Fact]
    public void Constructor_SetsPrimaryTagCorrectly()
    {
        var wallTag = new Tag("wall");
        var tile = new MapTile(wallTag);

        Assert.Equal(wallTag, tile.PrimaryTag);
        Assert.True(tile.HasTag(wallTag));
        Assert.Single(tile.Tags);
    }

    [Fact]
    public void PrimaryTag_IsDeterministic()
    {
        var wallTag = new Tag("wall");
        var tile = new MapTile(wallTag);
        
        // Add additional tags
        tile.AddTag(new Tag("stone"));
        tile.AddTag(new Tag("solid"));

        // Primary tag should remain consistent
        Assert.Equal(wallTag, tile.PrimaryTag);
        Assert.Equal(3, tile.Tags.Count);
    }

    [Fact]
    public void SetPrimaryTag_ClearsOtherTags()
    {
        var wallTag = new Tag("wall");
        var floorTag = new Tag("floor");
        var tile = new MapTile(wallTag);
        
        tile.AddTag(new Tag("stone"));
        tile.AddTag(new Tag("solid"));
        
        // Change primary tag
        tile.PrimaryTag = floorTag;
        
        Assert.Equal(floorTag, tile.PrimaryTag);
        Assert.True(tile.HasTag(floorTag));
        Assert.False(tile.HasTag(wallTag));
        Assert.Single(tile.Tags);
    }

    [Fact]
    public void AddTag_KeepsPrimaryTagUnchanged()
    {
        var wallTag = new Tag("wall");
        var tile = new MapTile(wallTag);
        
        tile.AddTag(new Tag("stone"));
        tile.AddTag(new Tag("solid"));
        
        Assert.Equal(wallTag, tile.PrimaryTag);
        Assert.Equal(3, tile.Tags.Count);
    }

    [Fact]
    public void RemoveTag_AllowsRemovalOfNonPrimaryTags()
    {
        var wallTag = new Tag("wall");
        var stoneTag = new Tag("stone");
        var tile = new MapTile(wallTag);
        
        tile.AddTag(stoneTag);
        tile.RemoveTag(stoneTag);
        
        Assert.Equal(wallTag, tile.PrimaryTag);
        Assert.False(tile.HasTag(stoneTag));
        Assert.Single(tile.Tags);
    }

    [Fact]
    public void RemoveTag_ThrowsWhenRemovingPrimaryTag()
    {
        var wallTag = new Tag("wall");
        var tile = new MapTile(wallTag);
        
        var exception = Assert.Throws<InvalidOperationException>(() => tile.RemoveTag(wallTag));
        Assert.Contains("Cannot remove the primary tag", exception.Message);
    }

    [Fact]
    public void Tags_ReturnsDefensiveCopy()
    {
        var wallTag = new Tag("wall");
        var tile = new MapTile(wallTag);
        
        var tags1 = tile.Tags;
        var tags2 = tile.Tags;
        
        // Should be different instances
        Assert.NotSame(tags1, tags2);
        // But same content
        Assert.Equal(tags1, tags2);
    }

    [Fact]
    public void DefaultConstructor_CreatesEmptyTag()
    {
        var tile = new MapTile();
        
        Assert.Equal("empty", tile.PrimaryTag.Name);
        Assert.True(tile.HasTag(new Tag("empty")));
    }
}