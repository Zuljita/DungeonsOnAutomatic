using CoreLogic.Tagging;

namespace CoreLogic.Generation;

public class WfcSolver
{
    private readonly List<IWfcConstraint> _constraints = new();
    private readonly Random _random;

    public WfcSolver(Random? random = null)
    {
        _random = random ?? new Random();
    }

    public void AddConstraint(IWfcConstraint constraint)
    {
        _constraints.Add(constraint);
    }

    public bool Solve(WfcGrid grid, int maxAttempts = 100)
    {
        // Initialize all constraints
        foreach (var constraint in _constraints)
        {
            constraint.Initialize(grid);
        }

        return SolveWithBacktracking(grid, maxAttempts);
    }

    private bool SolveWithBacktracking(WfcGrid grid, int maxAttempts)
    {
        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            if (TrySolve(grid))
                return true;

            // Reset grid for next attempt
            ResetGrid(grid);
        }

        return false;
    }

    private bool TrySolve(WfcGrid grid)
    {
        while (!grid.IsFullyCollapsed())
        {
            // Apply constraints
            foreach (var constraint in _constraints)
            {
                constraint.Check(grid);
            }

            // Check for contradictions
            if (grid.HasContradiction())
            {
                return false;
            }

            // Find cell with lowest entropy and collapse it
            var cell = grid.GetLowestEntropyCell();
            if (cell == null)
                break;

            grid.CollapseCell(cell);
        }

        return grid.IsFullyCollapsed() && !grid.HasContradiction();
    }

    private void ResetGrid(WfcGrid grid)
    {
        // This would need to restore the grid to its initial state
        // For now, this is a placeholder - full implementation would require
        // storing initial state or recreating the grid
        throw new NotImplementedException("Grid reset not implemented - full backtracking requires state management");
    }
}