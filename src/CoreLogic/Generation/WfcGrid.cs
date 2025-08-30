using System;
using System.Collections.Generic;
using System.Linq;
using DungeonsOnAutomatic.CoreLogic.Resources;
using DungeonsOnAutomatic.CoreLogic.Map;

namespace DungeonsOnAutomatic.CoreLogic.Generation;

/// <summary>
/// Manages the 2D WFC grid and orchestrates the observation-propagation loop.
/// </summary>
public class WfcGrid
{
    private readonly WfcCell[,] _cells;
    private readonly Random _random;
    private readonly List<IWFCConstraint> _constraints = new();
    private readonly Stack<WfcGridSnapshot> _snapshots = new();

    public int Width { get; }
    public int Height { get; }

    /// <summary>
    /// All cells in the grid.
    /// </summary>
    public WfcCell[,] Cells => _cells;

    /// <summary>
    /// Whether the generation has completed (all cells collapsed).
    /// </summary>
    public bool IsComplete => GetUncollapedCells().Count == 0;

    /// <summary>
    /// Whether the generation has failed (contradiction detected).
    /// </summary>
    public bool IsContradiction => GetContradictionCells().Any();

    public WfcGrid(int width, int height, IEnumerable<TileData> allPossibleTiles, Random? random = null)
    {
        Width = width;
        Height = height;
        _random = random ?? new Random();
        _cells = new WfcCell[width, height];

        var possibleTilesList = allPossibleTiles.Where(t => t != null).ToList();
        
        // Initialize all cells with all possible tiles
        for (int x = 0; x < width; x++)
        {
            for (int y = 0; y < height; y++)
            {
                _cells[x, y] = new WfcCell(x, y, possibleTilesList);
            }
        }
    }

    /// <summary>
    /// Add a constraint to this grid.
    /// </summary>
    public void AddConstraint(IWFCConstraint constraint)
    {
        _constraints.Add(constraint);
    }

    /// <summary>
    /// Get cell at specific coordinates.
    /// </summary>
    public WfcCell? GetCell(int x, int y)
    {
        if (x < 0 || x >= Width || y < 0 || y >= Height)
            return null;
        return _cells[x, y];
    }

    /// <summary>
    /// Get all neighboring cells (4-directional) of a given position.
    /// </summary>
    public IEnumerable<WfcCell> GetNeighbors(int x, int y)
    {
        var directions = new[] { (-1, 0), (1, 0), (0, -1), (0, 1) };
        
        foreach (var (dx, dy) in directions)
        {
            var neighbor = GetCell(x + dx, y + dy);
            if (neighbor != null)
                yield return neighbor;
        }
    }

    /// <summary>
    /// Get all neighboring cells (8-directional) of a given position.
    /// </summary>
    public IEnumerable<WfcCell> GetNeighbors8(int x, int y)
    {
        var directions = new[] { 
            (-1, -1), (-1, 0), (-1, 1),
            (0, -1),           (0, 1),
            (1, -1),  (1, 0),  (1, 1)
        };
        
        foreach (var (dx, dy) in directions)
        {
            var neighbor = GetCell(x + dx, y + dy);
            if (neighbor != null)
                yield return neighbor;
        }
    }

    /// <summary>
    /// Initialize all constraints.
    /// </summary>
    public void Initialize()
    {
        foreach (var constraint in _constraints)
        {
            constraint.Initialize(this);
        }
    }

    /// <summary>
    /// Perform one step of the WFC algorithm.
    /// Returns true if a step was taken, false if complete or failed.
    /// </summary>
    public bool Step()
    {
        if (IsComplete || IsContradiction)
            return false;

        // Find cell with lowest entropy > 0
        var cellToCollapse = FindLowestEntropyCell();
        if (cellToCollapse == null)
            return false;

        // Create snapshot for potential backtracking
        CreateSnapshot();

        // Choose and collapse a tile
        var chosenTile = SelectTileForCell(cellToCollapse);
        if (chosenTile == null)
        {
            // This should not happen if entropy > 0
            return false;
        }

        cellToCollapse.Collapse(chosenTile);

        // Propagate constraints
        if (!PropagateConstraints(cellToCollapse.X, cellToCollapse.Y))
        {
            // Constraint propagation failed, try backtracking
            if (!Backtrack())
            {
                return false; // Failed completely
            }
            return true; // Retry after backtracking
        }

        return true;
    }

    /// <summary>
    /// Run the complete WFC algorithm until completion or failure.
    /// </summary>
    /// <param name="maxIterations">Maximum iterations to prevent infinite loops</param>
    /// <returns>True if successful, false if failed</returns>
    public bool Generate(int maxIterations = 10000)
    {
        Initialize();

        int iterations = 0;
        while (!IsComplete && !IsContradiction && iterations < maxIterations)
        {
            if (!Step())
                break;
            iterations++;
        }

        return IsComplete && !IsContradiction;
    }

    /// <summary>
    /// Convert the collapsed WFC grid to a MapData object.
    /// </summary>
    public MapData ToMapData()
    {
        var mapData = new MapData(Width, Height);
        
        for (int x = 0; x < Width; x++)
        {
            for (int y = 0; y < Height; y++)
            {
                var cell = _cells[x, y];
                if (cell.IsCollapsed && cell.CollapsedTile != null)
                {
                    mapData[x, y] = cell.CollapsedTile.CreateMapTile();
                }
                else
                {
                    // Fallback for uncollapsed cells
                    mapData[x, y] = new MapTile(new Tagging.Tag("undefined"));
                }
            }
        }
        
        return mapData;
    }

    private WfcCell? FindLowestEntropyCell()
    {
        var candidates = GetUncollapedCells()
            .Where(cell => cell.Entropy > 0)
            .ToList();

        if (!candidates.Any())
            return null;

        var minEntropy = candidates.Min(cell => cell.Entropy);
        var lowestEntropyCells = candidates.Where(cell => cell.Entropy == minEntropy).ToList();

        // Return random cell among lowest entropy cells
        return lowestEntropyCells[_random.Next(lowestEntropyCells.Count)];
    }

    private TileData? SelectTileForCell(WfcCell cell)
    {
        if (cell.Entropy == 0)
            return null;

        var possibleTiles = cell.PossibleTiles.ToList();
        
        // Weighted random selection based on tile weights
        var totalWeight = possibleTiles.Sum(t => t?.Weight ?? 0);
        if (totalWeight <= 0)
            return possibleTiles.FirstOrDefault();

        var randomValue = (float)_random.NextDouble() * totalWeight;
        float currentWeight = 0;

        foreach (var tile in possibleTiles)
        {
            if (tile != null)
            {
                currentWeight += tile.Weight;
                if (randomValue <= currentWeight)
                    return tile;
            }
        }

        return possibleTiles.LastOrDefault();
    }

    private bool PropagateConstraints(int x, int y)
    {
        foreach (var constraint in _constraints)
        {
            if (!constraint.Propagate(this, x, y))
                return false;
        }
        return true;
    }

    private List<WfcCell> GetUncollapedCells()
    {
        var uncollapsed = new List<WfcCell>();
        for (int x = 0; x < Width; x++)
        {
            for (int y = 0; y < Height; y++)
            {
                if (!_cells[x, y].IsCollapsed)
                    uncollapsed.Add(_cells[x, y]);
            }
        }
        return uncollapsed;
    }

    private List<WfcCell> GetContradictionCells()
    {
        var contradictions = new List<WfcCell>();
        for (int x = 0; x < Width; x++)
        {
            for (int y = 0; y < Height; y++)
            {
                if (_cells[x, y].IsContradiction)
                    contradictions.Add(_cells[x, y]);
            }
        }
        return contradictions;
    }

    private void CreateSnapshot()
    {
        var cellSnapshots = new WfcCellSnapshot[Width, Height];
        for (int x = 0; x < Width; x++)
        {
            for (int y = 0; y < Height; y++)
            {
                cellSnapshots[x, y] = _cells[x, y].CreateSnapshot();
            }
        }
        _snapshots.Push(new WfcGridSnapshot(cellSnapshots));
    }

    private bool Backtrack()
    {
        if (_snapshots.Count == 0)
            return false; // No snapshots to backtrack to

        var snapshot = _snapshots.Pop();
        
        for (int x = 0; x < Width; x++)
        {
            for (int y = 0; y < Height; y++)
            {
                _cells[x, y].RestoreFromSnapshot(snapshot.CellSnapshots[x, y]);
            }
        }

        return true;
    }

    public override string ToString()
    {
        var completed = GetUncollapedCells().Count;
        var total = Width * Height;
        return $"WfcGrid({Width}x{Height}): {total - completed}/{total} collapsed";
    }
}

/// <summary>
/// Snapshot of the entire WFC grid for backtracking.
/// </summary>
public record WfcGridSnapshot(
    WfcCellSnapshot[,] CellSnapshots
);