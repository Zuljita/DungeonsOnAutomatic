
using Xunit;
using DungeonsOnAutomatic.CoreLogic.Generation;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using DungeonsOnAutomatic.CoreLogic.Map;
using System.Linq;

namespace CoreLogic.Tests.Generation;

public class WfcServiceTests
{
    [Fact]
    public void GenerateSimple_CreatesMapWithCorrectDimensions()
    {
        var tagService = new TagService();
        var wfcService = new WfcService(tagService);

        var map = wfcService.GenerateSimple(10, 15);

        Assert.NotNull(map);
        Assert.Equal(10, map.Width);
        Assert.Equal(15, map.Height);
    }

    [Fact]
    public void GenerateSimple_CreatesMonolithicMapWithAntagonism()
    {
        var tagService = new TagService();
        var wfcService = new WfcService(tagService);
        var wallTag = new Tag("Wall");
        var floorTag = new Tag("Floor");

        var map = wfcService.GenerateSimple(20, 20);

        bool isAllWall = true;
        bool isAllFloor = true;

        for (int y = 0; y < map.Height; y++)
        {
            for (int x = 0; x < map.Width; x++)
            {
                if (!map[x, y].HasTag(wallTag)) isAllWall = false;
                if (!map[x, y].HasTag(floorTag)) isAllFloor = false;
            }
        }

        Assert.True(isAllWall || isAllFloor, "Map should be either all walls or all floors.");
    }

    [Fact]
    public void Generate_ThrowsException_WhenSeedsAreAntagonistic()
    {
        // Arrange
        var tagService = new TagService();
        var wfcService = new WfcService(tagService);
        var wallTag = new Tag("Wall");
        var floorTag = new Tag("Floor");

        tagService.AddAntagonism(wallTag, floorTag);

        var wallTile = new DungeonsOnAutomatic.CoreLogic.Resources.TileData("Wall", wallTag);
        var floorTile = new DungeonsOnAutomatic.CoreLogic.Resources.TileData("Floor", floorTag);

        var tileSet = new DungeonsOnAutomatic.CoreLogic.Resources.TileSetData("TestSet");
        tileSet.AddTile(wallTile);
        tileSet.AddTile(floorTile);

        var seedTiles = new (int x, int y, DungeonsOnAutomatic.CoreLogic.Resources.TileData tile)[]
        {
            (0, 0, wallTile),
            (1, 0, floorTile)
        };

        // Act & Assert
        var exception = Assert.Throws<System.InvalidOperationException>(() => 
            wfcService.Generate(10, 10, tileSet, seedTiles)
        );
        Assert.Contains("Initial state is contradictory", exception.Message);
    }

    [Fact]
    public void GenerateSimple_DoesNotPlaceAntagonisticTilesAdjacently()
    {
        var tagService = new TagService();
        var wfcService = new WfcService(tagService);
        var wallTag = new Tag("Wall");
        var floorTag = new Tag("Floor");

        // The GenerateSimple method sets up this antagonism
        // _tagService.AddAntagonism(new Tag("Wall"), new Tag("Floor"));
        var map = wfcService.GenerateSimple(30, 30);

        for (int y = 0; y < map.Height; y++)
        {
            for (int x = 0; x < map.Width; x++)
            {
                var currentTile = map[x, y];
                
                // Check right neighbor
                if (x + 1 < map.Width)
                {
                    var rightTile = map[x + 1, y];
                    Assert.False(currentTile.HasTag(wallTag) && rightTile.HasTag(floorTag), $"Wall at ({x},{y}) is adjacent to Floor at ({x+1},{y})");
                    Assert.False(currentTile.HasTag(floorTag) && rightTile.HasTag(wallTag), $"Floor at ({x},{y}) is adjacent to Wall at ({x+1},{y})");
                }

                // Check bottom neighbor
                if (y + 1 < map.Height)
                {
                    var bottomTile = map[x, y + 1];
                    Assert.False(currentTile.HasTag(wallTag) && bottomTile.HasTag(floorTag), $"Wall at ({x},{y}) is adjacent to Floor at ({x},{y+1})");
                    Assert.False(currentTile.HasTag(floorTag) && bottomTile.HasTag(wallTag), $"Floor at ({x},{y}) is adjacent to Wall at ({x},{y+1})");
                }
            }
        }
    }

    [Fact]
    public void Generate_FailsGracefully_WithSelfAntagonisticTile()
    {
        // Arrange
        var tagService = new TagService();
        var wfcService = new WfcService(tagService);
        var poisonTag = new Tag("Poison");

        tagService.AddAntagonism(poisonTag, poisonTag);

        var poisonTile = new DungeonsOnAutomatic.CoreLogic.Resources.TileData("Poison", poisonTag);

        var tileSet = new DungeonsOnAutomatic.CoreLogic.Resources.TileSetData("PoisonSet");
        tileSet.AddTile(poisonTile);

        // Act & Assert
        var exception = Assert.Throws<System.InvalidOperationException>(() => 
            wfcService.Generate(5, 5, tileSet)
        );
        Assert.Equal("WFC generation failed - could not satisfy all constraints", exception.Message);
    }
}
