using CoreLogic.Tagging;

namespace CoreLogic.Generation;

public class WfcCell
{
    public int X { get; }
    public int Y { get; }
    public List<ITaggable> PossibleTiles { get; private set; }
    public bool IsCollapsed => PossibleTiles.Count == 1;
    public int Entropy => PossibleTiles.Count;

    public WfcCell(int x, int y, IEnumerable<ITaggable> possibleTiles)
    {
        X = x;
        Y = y;
        PossibleTiles = possibleTiles.ToList();
    }

    public void RemoveTile(ITaggable tile)
    {
        PossibleTiles.Remove(tile);
    }

    public void SetTile(ITaggable tile)
    {
        if (!PossibleTiles.Contains(tile))
            throw new ArgumentException("Tile is not in the list of possible tiles");

        PossibleTiles.Clear();
        PossibleTiles.Add(tile);
    }

    public ITaggable? GetCollapsedTile()
    {
        return IsCollapsed ? PossibleTiles[0] : null;
    }

    public bool CanPlaceTile(ITaggable tile)
    {
        return PossibleTiles.Contains(tile);
    }
}