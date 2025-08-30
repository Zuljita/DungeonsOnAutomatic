using Xunit;
using DungeonsOnAutomatic.CoreLogic.Map;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using DungeonsOnAutomatic.CoreLogic.Graph;

namespace CoreLogic.Tests.Graph;

public class RoomGraphBuilderTests
{
    [Fact]
    public void Build_FindsTwoRooms_WhenSeparatedByWalls()
    {
        var floor = new Tag("Floor");
        var wall = new Tag("Wall");

        var map = new MapData(4, 3);
        // Room 1: (0,0),(1,0)
        map[0,0] = new MapTile(floor);
        map[1,0] = new MapTile(floor);
        // Wall row: y=1
        map[0,1] = new MapTile(wall);
        map[1,1] = new MapTile(wall);
        map[2,1] = new MapTile(wall);
        map[3,1] = new MapTile(wall);
        // Room 2: (2,2),(3,2)
        map[2,2] = new MapTile(floor);
        map[3,2] = new MapTile(floor);

        var graph = RoomGraphBuilder.Build(map, floor);

        Assert.Equal(2, graph.Nodes.Count);
        Assert.Contains(graph.Nodes, n => n.Tiles.Contains((0,0)) && n.Tiles.Contains((1,0)));
        Assert.Contains(graph.Nodes, n => n.Tiles.Contains((2,2)) && n.Tiles.Contains((3,2)));
    }
}

