using System.Collections.Generic;
using System.Linq;
using DungeonsOnAutomatic.CoreLogic.Resources;

namespace DungeonsOnAutomatic.CoreLogic.Generation;

/// <summary>
/// Represents a single cell in the WFC grid, maintaining possible tile options and entropy.
/// </summary>
public class WfcCell
{
    private readonly List<TileData> _possibleTiles;
    private TileData? _collapsedTile;

    public int X { get; }
    public int Y { get; }

    /// <summary>
    /// All possible tiles that can be placed in this cell.
    /// </summary>
    public IReadOnlyList<TileData> PossibleTiles => _possibleTiles;

    /// <summary>
    /// The entropy (number of possible tiles) for this cell. Lower entropy = fewer options.
    /// </summary>
    public int Entropy => _possibleTiles.Count;

    /// <summary>
    /// Whether this cell has been collapsed to a single tile.
    /// </summary>
    public bool IsCollapsed => _collapsedTile != null;

    /// <summary>
    /// The final tile placed in this cell (only valid if IsCollapsed is true).
    /// </summary>
    public TileData? CollapsedTile => _collapsedTile;

    /// <summary>
    /// Whether this cell has any valid options remaining.
    /// </summary>
    public bool IsContradiction => _possibleTiles.Count == 0 && !IsCollapsed;

    public WfcCell(int x, int y, IEnumerable<TileData> possibleTiles)
    {
        X = x;
        Y = y;
        _possibleTiles = possibleTiles.ToList();
    }

    /// <summary>
    /// Collapse this cell to a specific tile.
    /// </summary>
    public void Collapse(TileData tile)
    {
        if (!_possibleTiles.Contains(tile))
        {
            throw new System.InvalidOperationException($"Cannot collapse to tile '{tile.Name}' - not in possible tiles list");
        }

        _collapsedTile = tile;
        _possibleTiles.Clear();
        _possibleTiles.Add(tile);
    }

    /// <summary>
    /// Remove tiles that are no longer possible due to constraints.
    /// Returns true if any tiles were removed.
    /// </summary>
    public bool RemovePossibleTiles(IEnumerable<TileData> tilesToRemove)
    {
        if (IsCollapsed) return false;

        var initialCount = _possibleTiles.Count;
        
        foreach (var tile in tilesToRemove.ToList())
        {
            _possibleTiles.Remove(tile);
        }

        return _possibleTiles.Count != initialCount;
    }

    /// <summary>
    /// Remove a single tile from possibilities.
    /// Returns true if the tile was removed.
    /// </summary>
    public bool RemovePossibleTile(TileData tile)
    {
        if (IsCollapsed) return false;
        return _possibleTiles.Remove(tile);
    }

    /// <summary>
    /// Check if a specific tile is still possible in this cell.
    /// </summary>
    public bool CanPlace(TileData tile)
    {
        return _possibleTiles.Contains(tile);
    }

    /// <summary>
    /// Reset this cell to uncollapsed state with new possible tiles.
    /// Used for backtracking.
    /// </summary>
    public void Reset(IEnumerable<TileData> possibleTiles)
    {
        _collapsedTile = null;
        _possibleTiles.Clear();
        _possibleTiles.AddRange(possibleTiles);
    }

    /// <summary>
    /// Create a snapshot of this cell's state for backtracking.
    /// </summary>
    public WfcCellSnapshot CreateSnapshot()
    {
        return new WfcCellSnapshot(
            _possibleTiles.ToList(),
            _collapsedTile
        );
    }

    /// <summary>
    /// Restore this cell's state from a snapshot.
    /// </summary>
    public void RestoreFromSnapshot(WfcCellSnapshot snapshot)
    {
        _collapsedTile = snapshot.CollapsedTile;
        _possibleTiles.Clear();
        _possibleTiles.AddRange(snapshot.PossibleTiles);
    }

    public override string ToString()
    {
        if (IsCollapsed)
            return $"Cell({X},{Y}): {_collapsedTile?.Name}";
        if (IsContradiction)
            return $"Cell({X},{Y}): CONTRADICTION";
        return $"Cell({X},{Y}): {Entropy} options";
    }
}

/// <summary>
/// Snapshot of a WfcCell's state for backtracking purposes.
/// </summary>
public record WfcCellSnapshot(
    List<TileData> PossibleTiles,
    TileData? CollapsedTile
);