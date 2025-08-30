using System.Collections.Generic;
using DungeonsOnAutomatic.CoreLogic.Tagging;

namespace DungeonsOnAutomatic.CoreLogic.Graph
{
    public class RoomNode
    {
        public int Id { get; }
        public int Size { get; set; }
        public (int x, int y) Centroid { get; set; }
        public HashSet<(int x, int y)> Tiles { get; } = new();
        public HashSet<Tag> Tags { get; } = new();

        public RoomNode(int id) { Id = id; }
    }

    public class RoomEdge
    {
        public int A { get; }
        public int B { get; }
        public RoomEdge(int a, int b) { A = a; B = b; }
    }

    public class RoomGraph
    {
        public List<RoomNode> Nodes { get; } = new();
        public List<RoomEdge> Edges { get; } = new();

        public RoomNode? GetNode(int id) => Nodes.Find(n => n.Id == id);
    }
}

