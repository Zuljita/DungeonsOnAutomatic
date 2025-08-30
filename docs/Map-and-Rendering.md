# Map and Rendering

Purpose: Explain the generated map structure and how it is rendered in Godot.

## MapData / MapTile

- MapData
  - Input: Collapsed `TileData` from WFC.
  - Logic: 2D array of `MapTile`, accessible via indexer `[x, y]` and `AllTiles()` enumerator.
  - Output: Stable data carrier for visualization or post-processing.
- MapTile
  - Input: Primary tag and optional additional tags.
  - Logic: Simple tagged container; add/remove tags (cannot remove primary without replacing it).
  - Output: Tag queries (`HasTag`, `HasAnyTag`, `HasAllTags`).

## MapRenderer (Godot)

- Input: `MapData` from `WorldGenerator`.
- Logic: Iterates grid and calls `TileMap.SetCell` with atlas coordinates based on tags.
- Output: Rendered map in Godot scene.

### Current Tag→Tile Mapping

- Hardcoded mapping (subject to change when integrating real TileSet):
  - Wall → tileId 0
  - Floor → tileId 1
  - Entrance → tileId 2
  - Treasure → tileId 3

### Pitfalls

- Specific before generic: Check `Entrance`/`Treasure` tags before `Floor` when a tile carries both.
- Resource coupling: Ensure your TileSet resource uses the expected IDs, or externalize a mapping table.

