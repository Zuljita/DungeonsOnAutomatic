using Xunit;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace CoreLogic.Tests.Tagging;

public class TagServiceTests
{
    [Fact]
    public void AddAffinity_CreatesBidirectionalRelationship()
    {
        var service = new TagService();
        var fire = new Tag("fire");
        var heat = new Tag("heat");

        service.AddAffinity(fire, heat);

        Assert.True(service.HaveAffinity(fire, heat));
        Assert.True(service.HaveAffinity(heat, fire));
    }

    [Fact]
    public void AddAntagonism_CreatesBidirectionalRelationship()
    {
        var service = new TagService();
        var fire = new Tag("fire");
        var water = new Tag("water");

        service.AddAntagonism(fire, water);

        Assert.False(service.AreCompatible(fire, water));
        Assert.False(service.AreCompatible(water, fire));
    }

    [Fact]
    public void AreCompatible_ReturnsTrueForUnrelatedTags()
    {
        var service = new TagService();
        var fire = new Tag("fire");
        var earth = new Tag("earth");

        Assert.True(service.AreCompatible(fire, earth));
    }

    [Fact]
    public void HaveAffinity_ReturnsFalseForUnrelatedTags()
    {
        var service = new TagService();
        var fire = new Tag("fire");
        var earth = new Tag("earth");

        Assert.False(service.HaveAffinity(fire, earth));
    }

    [Fact]
    public void GetAffinities_ReturnsCorrectTags()
    {
        var service = new TagService();
        var fire = new Tag("fire");
        var heat = new Tag("heat");
        var light = new Tag("light");

        service.AddAffinity(fire, heat);
        service.AddAffinity(fire, light);

        var affinities = service.GetAffinities(fire);

        Assert.Contains(heat, affinities);
        Assert.Contains(light, affinities);
        Assert.Equal(2, affinities.Count);
    }

    [Fact]
    public void GetAntagonisms_ReturnsCorrectTags()
    {
        var service = new TagService();
        var fire = new Tag("fire");
        var water = new Tag("water");
        var ice = new Tag("ice");

        service.AddAntagonism(fire, water);
        service.AddAntagonism(fire, ice);

        var antagonisms = service.GetAntagonisms(fire);

        Assert.Contains(water, antagonisms);
        Assert.Contains(ice, antagonisms);
        Assert.Equal(2, antagonisms.Count);
    }

    [Fact]
    public void GetAffinities_ReturnsEmptySetForUnknownTag()
    {
        var service = new TagService();
        var unknownTag = new Tag("unknown");

        var affinities = service.GetAffinities(unknownTag);

        Assert.Empty(affinities);
    }

    [Fact]
    public void GetAntagonisms_ReturnsEmptySetForUnknownTag()
    {
        var service = new TagService();
        var unknownTag = new Tag("unknown");

        var antagonisms = service.GetAntagonisms(unknownTag);

        Assert.Empty(antagonisms);
    }

    [Fact]
    public void TagService_HandlesSymmetricRelationshipsCorrectly()
    {
        var service = new TagService();
        var wall = new Tag("wall");
        var floor = new Tag("floor");

        service.AddAntagonism(wall, floor);

        Assert.False(service.AreCompatible(wall, floor));
        Assert.False(service.AreCompatible(floor, wall));
        
        Assert.Contains(floor, service.GetAntagonisms(wall));
        Assert.Contains(wall, service.GetAntagonisms(floor));
    }
}