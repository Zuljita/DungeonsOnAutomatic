namespace DungeonsOnAutomatic.CoreLogic.Generation;

/// <summary>
/// Interface for pluggable WFC constraints.
/// Allows modular addition of rules without modifying the core solver.
/// </summary>
public interface IWFCConstraint
{
    /// <summary>
    /// Unique identifier for this constraint type.
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Called once before generation to apply initial constraints.
    /// Use this to set up any initial tile restrictions or seed tiles.
    /// </summary>
    /// <param name="grid">The WFC grid to initialize</param>
    void Initialize(WfcGrid grid);

    /// <summary>
    /// Called after each tile placement to check for violations
    /// and apply dynamic constraints to neighboring cells.
    /// </summary>
    /// <param name="grid">The WFC grid to check/modify</param>
    /// <param name="lastCollapsedX">X coordinate of the most recently collapsed cell</param>
    /// <param name="lastCollapsedY">Y coordinate of the most recently collapsed cell</param>
    /// <returns>True if constraint propagation was successful, false if contradiction detected</returns>
    bool Propagate(WfcGrid grid, int lastCollapsedX, int lastCollapsedY);

    /// <summary>
    /// Called to validate the current state of the grid.
    /// Should return false if the constraint is violated.
    /// </summary>
    /// <param name="grid">The WFC grid to validate</param>
    /// <returns>True if the constraint is satisfied, false otherwise</returns>
    bool Validate(WfcGrid grid);
}