using System;
using Xunit;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace CoreLogic.Tests.Tagging;

public class TagTests
{
    [Fact]
    public void Constructor_WithValidName_CreatesTag()
    {
        var tag = new Tag("fire");
        
        Assert.Equal("fire", tag.Name);
    }

    [Fact]
    public void Constructor_WithWhitespaceName_TrimsAndCreatesTag()
    {
        var tag = new Tag("  fire  ");
        
        Assert.Equal("fire", tag.Name);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\t\n")]
    public void Constructor_WithInvalidName_ThrowsArgumentException(string? invalidName)
    {
        var exception = Assert.Throws<ArgumentException>(() => new Tag(invalidName!));
        Assert.Contains("cannot be null, empty, or whitespace", exception.Message);
    }

    [Fact]
    public void TryCreate_WithValidName_ReturnsTrue()
    {
        var success = Tag.TryCreate("fire", out var tag);
        
        Assert.True(success);
        Assert.Equal("fire", tag.Name);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void TryCreate_WithInvalidName_ReturnsFalse(string? invalidName)
    {
        var success = Tag.TryCreate(invalidName, out var tag);
        
        Assert.False(success);
        Assert.Equal(default, tag);
    }

    [Fact]
    public void Create_WithValidName_CreatesTag()
    {
        var tag = Tag.Create("fire");
        
        Assert.Equal("fire", tag.Name);
    }

    [Fact]
    public void Equality_WorksCorrectly()
    {
        var tag1 = new Tag("fire");
        var tag2 = new Tag("fire");
        var tag3 = new Tag("water");

        Assert.Equal(tag1, tag2);
        Assert.True(tag1 == tag2);
        Assert.False(tag1 == tag3);
        Assert.True(tag1 != tag3);
    }

    [Fact]
    public void ImplicitConversions_WorkCorrectly()
    {
        Tag tag = "fire";
        string name = tag;

        Assert.Equal("fire", tag.Name);
        Assert.Equal("fire", name);
    }
}