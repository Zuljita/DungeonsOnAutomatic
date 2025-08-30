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
        // Propagate constraints from any pre-collapsed (e.g. seeded) cells.
        for (int x = 0; x < grid.Width; x++)
        {
            for (int y = 0; y < grid.Height; y++)
            {
                var cell = grid.GetCell(x, y);
                if (cell?.IsCollapsed == true)
                {
                    if (!Propagate(grid, x, y))
                    {
                        // This would mean the seeds themselves are contradictory, which is an invalid starting state.
                        throw new System.InvalidOperationException($"Initial state is contradictory due to seed at ({x},{y}).");
                    }
                }
            }
        }
    }

    public bool Propagate(WfcGrid grid, int startX, int startY)
    {
        var queue = new System.Collections.Generic.Queue<(int x, int y)>();
        queue.Enqueue((startX, startY));

        while (queue.Count > 0)
        {
            var (x, y) = queue.Dequeue();
            var cell = grid.GetCell(x, y);
            if (cell?.CollapsedTile == null) continue;

            var collapsedTags = cell.CollapsedTile.Tags.ToList();

            foreach (var neighbor in grid.GetNeighbors(x, y))
            {
                if (neighbor.IsCollapsed)
                {
                    if (neighbor.CollapsedTile != null && HasAntagonisticTags(collapsedTags, neighbor.CollapsedTile.Tags.ToList()))
                    {
                        return false; // Contradiction
                    }
                    continue;
                }

                var tilesToRemove = neighbor.PossibleTiles
                    .Where(tile => HasAntagonisticTags(collapsedTags, tile.Tags.ToList()))
                    .ToList();

                if (tilesToRemove.Any())
                {
                    if (!neighbor.RemovePossibleTiles(tilesToRemove))
                    {
                        continue; // No change
                    }

                    if (neighbor.IsContradiction)
                    {
                        return false; // Contradiction
                    }

                    if (neighbor.Entropy == 1)
                    {
                        neighbor.Collapse(neighbor.PossibleTiles.First());
                        queue.Enqueue((neighbor.X, neighbor.Y));
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