using System.Linq;
using DungeonsOnAutomatic.CoreLogic.Tagging;
using DungeonsOnAutomatic.CoreLogic.Resources;

namespace DungeonsOnAutomatic.CoreLogic.Generation;

/// <summary>
/// WFC constraint that enforces tag-based adjacency rules using the TagService.
/// Prevents antagonistic tags from being placed adjacent to each other.
/// </summary>
public class TagAdjacencyConstraint : IWFCConstraint
{
    private readonly TagService _tagService;

    public string Name => "TagAdjacency";

    public TagAdjacencyConstraint(TagService tagService)
    {
        _tagService = tagService;
    }

    public void Initialize(WfcGrid grid)
    {
        // No initial constraints needed - adjacency is enforced during propagation
    }

    public bool Propagate(WfcGrid grid, int lastCollapsedX, int lastCollapsedY)
    {
        var collapsedCell = grid.GetCell(lastCollapsedX, lastCollapsedY);
        if (collapsedCell?.CollapsedTile == null)
            return true; // Nothing to propagate

        var collapsedTile = collapsedCell.CollapsedTile;

        // Get all tags from the collapsed tile
        var collapsedTags = collapsedTile.Tags.ToList();

        // For each neighbor, remove tiles that are antagonistic to any of the collapsed tile's tags
        foreach (var neighbor in grid.GetNeighbors(lastCollapsedX, lastCollapsedY))
        {
            if (neighbor.IsCollapsed)
                continue; // Skip already collapsed neighbors

            var tilesToRemove = neighbor.PossibleTiles
                .Where(tile => HasAntagonisticTags(collapsedTags, tile.Tags.ToList()))
                .ToList();

            if (tilesToRemove.Any())
            {
                var removed = neighbor.RemovePossibleTiles(tilesToRemove);
                
                // Check if this created a contradiction
                if (neighbor.IsContradiction)
                {
                    return false; // Propagation failed
                }

                // If we removed tiles, recursively propagate from this neighbor
                if (removed && neighbor.Entropy == 1)
                {
                    // This neighbor now has only one option - collapse it
                    var remainingTile = neighbor.PossibleTiles.First();
                    neighbor.Collapse(remainingTile);
                    
                    // Recursively propagate from the newly collapsed neighbor
                    if (!Propagate(grid, neighbor.X, neighbor.Y))
                    {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    public bool Validate(WfcGrid grid)
    {
        // Check all adjacent collapsed cells for antagonistic relationships
        for (int x = 0; x < grid.Width; x++)
        {
            for (int y = 0; y < grid.Height; y++)
            {
                var cell = grid.GetCell(x, y);
                if (cell?.IsCollapsed != true || cell.CollapsedTile == null)
                    continue;

                var cellTags = cell.CollapsedTile.Tags.ToList();

                // Check each neighbor
                foreach (var neighbor in grid.GetNeighbors(x, y))
                {
                    if (!neighbor.IsCollapsed || neighbor.CollapsedTile == null)
                        continue;

                    var neighborTags = neighbor.CollapsedTile.Tags.ToList();

                    // Check if any tags are antagonistic
                    if (HasAntagonisticTags(cellTags, neighborTags))
                    {
                        return false; // Validation failed - antagonistic tiles are adjacent
                    }
                }
            }
        }

        return true; // All adjacencies are valid
    }

    /// <summary>
    /// Check if any tags from the first list are antagonistic to any tags from the second list.
    /// </summary>
    private bool HasAntagonisticTags(System.Collections.Generic.List<Tag> tags1, System.Collections.Generic.List<Tag> tags2)
    {
        foreach (var tag1 in tags1)
        {
            foreach (var tag2 in tags2)
            {
                if (!_tagService.AreCompatible(tag1, tag2))
                {
                    return true; // Found antagonistic pair
                }
            }
        }
        return false; // No antagonistic pairs found
    }
}