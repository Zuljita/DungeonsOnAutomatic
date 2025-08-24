# Corridor Generation: Purged or Pending Features

This document tracks corridor-generation code and ideas that were removed or sidelined during the consolidation into `src/services/corridors.ts`. Items here may represent unimplemented features, experiments, or duplicated logic. Use this as a reference for future design decisions.

## Status Summary

- Canonical corridor generation now lives in `src/services/corridors.ts` with two safe algorithms:
  - `astar`: shape-aware routing that avoids room interiors and prefers a single-turn L when unobstructed.
  - `manhattan`: classic L-shape attempt that never cuts rooms; falls back to A* when blocked.
- `src/services/map-generator.ts` no longer generates corridors; it delegates to `corridors.ts` and only performs width expansion (now width-aware of room interiors).

## Removed/Deprecated in map-generator.ts

These were part of legacy or experimental implementations and are either commented out or no longer used.

1) Graph-based corridor planning (room graph + MST)
- `buildRoomGraph(rooms, allowDeadends)`
- `connectRoomsWithGraph(rooms, connections, options)`
  - Intent: Build Delaunay triangulation -> MST -> optional extra edges to reduce dead-ends.
  - Rationale for removal: Duplication and drift from `corridors.ts`. Graph selection is now implicit in how `corridors.ts` pairs rooms.
  - If revisited: We could reintroduce an explicit “room graph” phase before routing to influence overall topology (branchiness, loops).

2) Classic Manhattan center-to-center helpers
- `manhattanPath(a, b)` and `trimPath(path, roomA, roomB)`
  - Intent: Ultra-simple L-shaped paths with minimal cost and no dependencies.
  - Issues: Didn’t respect other rooms; trimming only handled endpoints.
  - Replacement: `manhattan` mode in `corridors.ts` now tries door-to-door L paths with collision checks and A* fallback.

3) Per-type path builders (unimplemented style variants)
- `createPath(type, room1, room2, allRooms, mapWidth, mapHeight)`
- `createMazePathBetweenPoints(start, end)`
- `createWindingPathBetweenPoints(start, end)`
- `createStraightPathBetweenPoints(start, end)`
- `createMazePathWithCollisionDetection(start, end, rooms, excludeRooms)`
- `createWindingPathWithCollisionDetection(start, end, rooms, excludeRooms)`
- `createBattleMapPath(start, end, rooms, excludeRooms)`
- `createSimpleLShapedPath(start, end)`
- `createLShapedPathWithCollisionAvoidance(start, end, horizontalFirst, rooms, allowedEdgePoints)`
  - Intent: Offer stylistic variants (maze/winding/straight) and collision-aware L shapes.
  - Status: Not wired into the current flow; overlaps/conflicts with `corridors.ts` behavior.
  - If revisited: These can be reintroduced as style layers on top of the routed path (post-process), or as cost-shaping options within A*.

4) Local A* and cost-grid utilities (duplicated here and in corridors)
- `findPathAStar(start, goal, rooms, width, height)`
- `generateCostGrid(rooms, width, height, start, end)`
- `getRoomEdgePositions(room)`
  - Intent: Route corridors via A* while discouraging interior tiles and allowing door-edge access.
  - Rationale: We now use the unified implementation in `corridors.ts` to avoid duplication.

5) Room collision and spatial helpers (local versions)
- `isRoomCollision(x, y, rooms, allowedEdgePoints, roomSpatialIndex)`
- `countRoomCollisions(path, rooms, allowedEdgePoints, roomSpatialIndex)`
- `createRoomSpatialIndex(rooms)`
- `isPointOnRoomWall(room, x, y)`
  - Intent: Precise, shape-aware collision checks for corridor generation.
  - Rationale: Corridor routing now happens in `corridors.ts`. Width expansion in `map-generator.ts` uses shape checks directly and avoids these utilities.

6) Door/connection point helpers
- `calculateConnectionPoints(room1, room2)`
- `getRoomCenter(room)`
- `findClosestPointOnRoomEdge(room, edge, targetPoint)`
  - Intent: Choose sensible door/edge connection points between rooms.
  - Note: `corridors.ts` now computes door points for routing; these helpers in `map-generator.ts` are redundant.

## Changes in corridors.ts

1) Removed classic center-to-center Manhattan connector
- `connectWithManhattanPathfinding(...)` (center-to-center, unused)
  - Replaced by: Door-to-door L-shape attempt with shape-aware collision checks and A* fallback.

2) Shape-aware blocking grid
- `createPathfindingGrid(...)` updated to use `roomShapeService.isPointInRoom` to block interiors for non-rectangular rooms; edge tiles remain walkable for doors.

3) L-shape preference
- Added `preferLShape?: boolean` to `EnhancedPathfindingOptions`.
- When enabled (default), try HV/VH L paths before invoking A*.

## Potential Future Work

- Style variants as cost filters/post-processing:
  - “Maze” or “winding” feel can be achieved by adding slight noise to costs or post-processing the routed path to introduce controlled meanders, while preserving wall avoidance.
- Topology control:
  - If we want loops vs. trees, reintroduce a room-graph planning phase (Delaunay/MST + extra edges) in a dedicated, unified place (preferably `corridors.ts`).
- Width-aware door placement:
  - For wide corridors, we may want smarter door placement or edge carving to guarantee clearance without clipping room interiors.

---

Last updated: ${new Date().toISOString()}

