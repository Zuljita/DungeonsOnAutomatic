using CoreLogic.Tagging;

namespace CoreLogic.Generation;

public class TagAdjacencyConstraint : IWfcConstraint
{
    private readonly TagService _tagService;

    public TagAdjacencyConstraint(TagService tagService)
    {
        _tagService = tagService ?? throw new ArgumentNullException(nameof(tagService));
    }

    public void Initialize(WfcGrid grid)
    {
        // Initial constraint application - could be used for pre-processing
    }

    public void Check(WfcGrid grid)
    {
        bool changesMade;
        do
        {
            changesMade = false;
            
            foreach (var cell in grid.GetAllCells())
            {
                if (cell.IsCollapsed)
                    continue;

                var tilesToRemove = new List<ITaggable>();

                foreach (var tile in cell.PossibleTiles.ToList())
                {
                    if (!CanTileBePlaced(tile, cell, grid))
                    {
                        tilesToRemove.Add(tile);
                    }
                }

                foreach (var tile in tilesToRemove)
                {
                    cell.RemoveTile(tile);
                    changesMade = true;
                }
            }
        } 
        while (changesMade);
    }

    private bool CanTileBePlaced(ITaggable tile, WfcCell cell, WfcGrid grid)
    {
        var neighbors = grid.GetNeighbors(cell.X, cell.Y);
        
        foreach (var neighbor in neighbors)
        {
            if (neighbor.IsCollapsed)
            {
                var neighborTile = neighbor.GetCollapsedTile()!;
                if (!_tagService.CanBeAdjacent(tile, neighborTile))
                {
                    return false;
                }
            }
            else
            {
                // Check if any possible tile in the neighbor can be adjacent to this tile
                bool hasValidNeighborTile = neighbor.PossibleTiles.Any(neighborTile => 
                    _tagService.CanBeAdjacent(tile, neighborTile));
                
                if (!hasValidNeighborTile)
                {
                    return false;
                }
            }
        }
        
        return true;
    }
}