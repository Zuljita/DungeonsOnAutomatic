# Wave Function Collapse (WFC) Engine

Goal: Precisely describe inputs, core logic, outputs, and failure modes for the WFC path.

## Inputs

- Dimensions: `width`, `height`.
- Content: `TileSetData tileSet` (array of `TileData`).
- Rules: `TagService` (affinities / antagonisms) injected into `WfcService` and used by `TagAdjacencyConstraint`.
- Seeds: Optional `params (int x, int y, TileData tile)[]` positions to pre-collapse.
- Random: `Random` instance (default if not provided).

## Core Types

- `WfcService`
  - Facade for generation. Composes constraints and runs the grid.
- `WfcGrid`
  - Holds `WfcCell[,]` with possible tiles and collapsed state.
  - Orchestrates Steps: select lowest entropy cell -> collapse -> propagate -> backtrack if needed.
- `WfcCell`
  - Maintains `PossibleTiles`, `CollapsedTile`, and convenience flags.
- Constraints (`IWFCConstraint`)
  - `SeedConstraint`: Pre-collapses specified cells.
  - `TagAdjacencyConstraint`: Enforces antagonisms using `TagService`.

## Algorithm (Logic)

1) Build grid with all tiles possible in each cell.
2) Add constraints:
   - If seeds exist, add `SeedConstraint` (so they are applied before adjacency).
   - Add `TagAdjacencyConstraint`.
3) Initialize constraints:
   - `SeedConstraint.Initialize` collapses seeded cells.
   - `TagAdjacencyConstraint.Initialize` propagates from all pre-collapsed cells and validates neighbors.
4) Loop `Step()` until done/failure:
   - Choose lowest-entropy cell (>0), snapshot grid, pick weighted tile, collapse.
   - Propagate constraints from that position.
   - On failure: backtrack to last snapshot, remove the tried tile from that cell, continue.
5) Success -> `ToMapData()` converts collapsed tiles to `MapTile`s.

## Outputs

- Success: `MapData` (Width × Height), each cell a `MapTile` with tags derived from `TileData`.
- Failure: Throws `InvalidOperationException` with message:
  - Seeds contradictory: "Initial state is contradictory …"
  - Unsatisfiable during generation: "WFC generation failed - could not satisfy all constraints"

## Failure & Safety

- Backtracking guard: After backtrack, the failing tile is removed to avoid infinite loops.
- Iteration cap: `Generate(int maxIterations = 10000)` prevents runaway loops.

## Extending Rules

- Implement `IWFCConstraint` with:
  - `Initialize(WfcGrid grid)` — optional pre-pass.
  - `Propagate(WfcGrid grid, int x, int y)` — return false on contradiction. May collapse neighbors when entropy becomes 1.
- Add constraints in `WfcService.Generate` before running `grid.Generate()`.

## Common Pitfalls

- Seeds must reference `TileData` from `tileSet.Tiles` (reference equality used by `CanPlace`).
- If special tiles include more generic tags (e.g., `Entrance` includes `Floor`), renderers/validators should check specific tags before generic ones.
- Ensure TagService has complete relationships (plugins should call `RegisterTags`).

