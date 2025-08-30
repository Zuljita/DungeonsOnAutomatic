using CoreLogic.Tagging;

namespace CoreLogic.Generation;

public class WfcGrid
{
    public int Width { get; }
    public int Height { get; }
    private readonly WfcCell[,] _cells;
    private readonly Random _random;

    public WfcGrid(int width, int height, IEnumerable<ITaggable> availableTiles, Random? random = null)
    {
        Width = width;
        Height = height;
        _random = random ?? new Random();
        _cells = new WfcCell[width, height];

        var tileList = availableTiles.ToList();
        for (int x = 0; x < width; x++)
        {
            for (int y = 0; y < height; y++)
            {
                _cells[x, y] = new WfcCell(x, y, tileList);
            }
        }
    }

    public WfcCell GetCell(int x, int y)
    {
        if (x < 0 || x >= Width || y < 0 || y >= Height)
            throw new ArgumentOutOfRangeException("Coordinates are outside grid bounds");
        
        return _cells[x, y];
    }

    public IEnumerable<WfcCell> GetNeighbors(int x, int y)
    {
        var neighbors = new List<WfcCell>();
        
        // Cardinal directions (up, right, down, left)
        var directions = new[] { (0, -1), (1, 0), (0, 1), (-1, 0) };
        
        foreach (var (dx, dy) in directions)
        {
            int nx = x + dx;
            int ny = y + dy;
            
            if (nx >= 0 && nx < Width && ny >= 0 && ny < Height)
            {
                neighbors.Add(_cells[nx, ny]);
            }
        }
        
        return neighbors;
    }

    public WfcCell? GetLowestEntropyCell()
    {
        WfcCell? lowestCell = null;
        int lowestEntropy = int.MaxValue;

        for (int x = 0; x < Width; x++)
        {
            for (int y = 0; y < Height; y++)
            {
                var cell = _cells[x, y];
                if (!cell.IsCollapsed && cell.Entropy < lowestEntropy && cell.Entropy > 0)
                {
                    lowestEntropy = cell.Entropy;
                    lowestCell = cell;
                }
            }
        }

        return lowestCell;
    }

    public bool IsFullyCollapsed()
    {
        for (int x = 0; x < Width; x++)
        {
            for (int y = 0; y < Height; y++)
            {
                if (!_cells[x, y].IsCollapsed)
                    return false;
            }
        }
        return true;
    }

    public bool HasContradiction()
    {
        for (int x = 0; x < Width; x++)
        {
            for (int y = 0; y < Height; y++)
            {
                if (_cells[x, y].Entropy == 0)
                    return true;
            }
        }
        return false;
    }

    public void CollapseCell(WfcCell cell)
    {
        if (cell.IsCollapsed)
            return;

        if (cell.Entropy == 0)
            throw new InvalidOperationException("Cannot collapse cell with no possible tiles");

        var selectedTile = cell.PossibleTiles[_random.Next(cell.PossibleTiles.Count)];
        cell.SetTile(selectedTile);
    }

    public IEnumerable<WfcCell> GetAllCells()
    {
        for (int x = 0; x < Width; x++)
        {
            for (int y = 0; y < Height; y++)
            {
                yield return _cells[x, y];
            }
        }
    }
}