# Tiles and TileSets

Purpose: Describe `TileData` and `TileSetData` as content inputs to generation.

## TileData

- Input: Name, tags, optional weight (default 1.0), `CanBeSeed` flag.
- Logic: Maintains a set of tags and a primary tag (first tag). Can add/remove tags.
- Output: Converts to `MapTile` via `CreateMapTile()`.

## TileSetData

- Input: Array of `TileData` and optional metadata.
- Logic: Simple collection management and helpers (filter by tag, weighted selection helper, validation).
- Output: `Tiles` array used by `WfcGrid` to initialize possibilities.

## Relationships

- `TileSetData.InitializeTagRelationships()` sets up an internal TagService with default/custom rules.
- Current WFC pipeline uses the `TagService` from `WfcService` instead. Keep rules registered via plugin `RegisterTags` to ensure constraints see them.

## Seeding Rule

- Seeds must reference the same `TileData` instance included in the `TileSetData.Tiles` array.
- Creating new `TileData` for seeds will fail `cell.CanPlace(tile)` checks.

## Weights

- Weighted selection is used when collapsing a cell. Ensure weights reflect desired distribution (e.g., Floor more common than Wall).

