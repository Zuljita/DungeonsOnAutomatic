using System;
using System.Linq;
using DungeonsOnAutomatic.CoreLogic.Resources;

namespace DungeonsOnAutomatic.CoreLogic.Generation;

/// <summary>
/// WFC constraint that pre-places specific tiles at specified positions (seeds).
/// </summary>
public class SeedConstraint : IWFCConstraint
{
    private readonly (int x, int y, TileData tile)[] _seedTiles;

    public string Name => "Seed";

    public SeedConstraint(params (int x, int y, TileData tile)[] seedTiles)
    {
        _seedTiles = seedTiles;
    }

    public void Initialize(WfcGrid grid)
    {
        foreach (var (x, y, tile) in _seedTiles)
        {
            var cell = grid.GetCell(x, y);
            if (cell == null)
            {
                throw new ArgumentException($"Seed position ({x}, {y}) is outside grid bounds");
            }

            if (!cell.CanPlace(tile))
            {
                throw new ArgumentException($"Cannot place seed tile '{tile.Name}' at ({x}, {y}) - not in possible tiles");
            }

            // Collapse the cell to the seed tile
            cell.Collapse(tile);
        }
    }

    public bool Propagate(WfcGrid grid, int lastCollapsedX, int lastCollapsedY)
    {
        // Seeds are placed during initialization, no additional propagation needed
        return true;
    }

    public bool Validate(WfcGrid grid)
    {
        // Verify all seed tiles are still placed correctly
        return _seedTiles.All(seed => 
        {
            var cell = grid.GetCell(seed.x, seed.y);
            return cell?.IsCollapsed == true && cell.CollapsedTile == seed.tile;
        });
    }
}