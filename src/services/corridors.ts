import { Corridor, Room } from '../core/types';
import { id } from './random';
import { roomShapeService } from './room-shapes';
import { createSimpleUnionFind } from '../utils/union-find';

// Enhanced pathfinding options
export interface EnhancedPathfindingOptions {
  algorithm: 'astar' | 'jumppoint' | 'dijkstra' | 'manhattan';
  usePathfindingLib: boolean;
  // Prefer classic single-turn L paths when unobstructed
  preferLShape?: boolean;
}

// Load PathFinding.js library
import * as PF from 'pathfinding';
const DEBUG = (typeof process !== 'undefined' && process?.env?.DOA_DEBUG_CORRIDORS === '1');
import { distanceFromPointToLineSegment } from '../utils/geometry';

type Edge = { a: number; b: number; d: number };

// Pathfinding types for compatibility
interface PathPoint {
  x: number;
  y: number;
}

/**
 * Generate a cost grid for pathfinding
 * Higher costs discourage pathfinding through certain areas
 */
function generateCostGrid(rooms: Room[], width: number, height: number): number[][] {
  // Initialize with base cost of 1 for all tiles
  const costGrid: number[][] = Array(height).fill(null).map(() => Array(width).fill(1));
  
  // Set high cost for room interiors (but not edges where doors will be)
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          // High cost for room interiors to discourage pathfinding through them
          costGrid[y][x] = 20;
        }
      }
    }
    
    // Lower cost for room edges where doors can be placed
    // Top and bottom edges
    for (let x = room.x; x < room.x + room.w; x++) {
      if (x >= 0 && x < width) {
        if (room.y >= 0 && room.y < height) costGrid[room.y][x] = 5;
        if (room.y + room.h - 1 >= 0 && room.y + room.h - 1 < height) costGrid[room.y + room.h - 1][x] = 5;
      }
    }
    // Left and right edges
    for (let y = room.y; y < room.y + room.h; y++) {
      if (y >= 0 && y < height) {
        if (room.x >= 0 && room.x < width) costGrid[y][room.x] = 5;
        if (room.x + room.w - 1 >= 0 && room.x + room.w - 1 < width) costGrid[y][room.x + room.w - 1] = 5;
      }
    }
  }
  
  return costGrid;
}

/**
 * Calculate optimal door connection points between two rooms
 */
function calculateDoorConnectionPoints(room1: Room, room2: Room): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  const center1 = { x: room1.x + Math.floor(room1.w / 2), y: room1.y + Math.floor(room1.h / 2) };
  const center2 = { x: room2.x + Math.floor(room2.w / 2), y: room2.y + Math.floor(room2.h / 2) };
  
  const dx = center2.x - center1.x;
  const dy = center2.y - center1.y;
  
  let startDirection: 'top' | 'bottom' | 'left' | 'right';
  let endDirection: 'top' | 'bottom' | 'left' | 'right';
  
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      startDirection = 'right';
      endDirection = 'left';
    } else {
      startDirection = 'left';
      endDirection = 'right';
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      startDirection = 'bottom';
      endDirection = 'top';
    } else {
      startDirection = 'top';
      endDirection = 'bottom';
    }
  }
  
  const start = roomShapeService.findClosestEdgePoint(room1, startDirection, center2);
  const end = roomShapeService.findClosestEdgePoint(room2, endDirection, center1);
  
  return { start, end };
}

// Helper: check if a grid cell is inside any room interior (shape-aware)
function isInsideAnyRoom(x: number, y: number, rooms: Room[], allowRoomIds: string[] = []): boolean {
  for (const room of rooms) {
    if (allowRoomIds.includes(room.id)) continue;
    if (room.shape !== 'rectangular' && room.shapePoints) {
      if (roomShapeService.isPointInRoom(room, x, y)) return true;
    } else {
      if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) return true;
    }
  }
  return false;
}

// Build canonical L-shaped paths (HV and VH) between two points
function buildLPaths(
  start: { x: number; y: number },
  end: { x: number; y: number }
): Array<{ x: number; y: number }[]> {
  const pathHV: { x: number; y: number }[] = [];
  const xStep = start.x <= end.x ? 1 : -1;
  const yStep = start.y <= end.y ? 1 : -1;
  for (let x = start.x; x !== end.x; x += xStep) pathHV.push({ x, y: start.y });
  for (let y = start.y; y !== end.y; y += yStep) pathHV.push({ x: end.x, y });
  pathHV.push({ x: end.x, y: end.y });

  const pathVH: { x: number; y: number }[] = [];
  for (let y = start.y; y !== end.y; y += yStep) pathVH.push({ x: start.x, y });
  for (let x = start.x; x !== end.x; x += xStep) pathVH.push({ x, y: end.y });
  pathVH.push({ x: end.x, y: end.y });

  return [pathHV, pathVH];
}

// Validate an L-shaped path does not cut through rooms.
// Allows the first and last points (door cells) even if on room boundary.
function validateLPath(
  path: { x: number; y: number }[],
  rooms: Room[],
  start: { x: number; y: number },
  end: { x: number; y: number },
  allowRoomIds: string[]
): boolean {
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    // Allow endpoints regardless (door cells on edges)
    if ((p.x === start.x && p.y === start.y) || (p.x === end.x && p.y === end.y)) continue;
    if (isInsideAnyRoom(p.x, p.y, rooms, allowRoomIds)) {
      if (DEBUG) {
        const hit = rooms.find(r => r && isInsideAnyRoom(p.x, p.y, [r], []));
        console.warn(`[corridors] L-path collision at (${p.x},${p.y}) inside room ${hit?.id ?? 'unknown'}`);
      }
      return false;
    }
  }
  return true;
}

// Attempt to find an orthogonal path by sliding the elbow along open space
function findOrthogonalPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  rooms: Room[],
  allowRoomIds: string[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): { x: number; y: number }[] | null {
  const [hv, vh] = buildLPaths(start, end);
  if (validateLPath(hv, rooms, start, end, allowRoomIds)) return hv;
  if (validateLPath(vh, rooms, start, end, allowRoomIds)) return vh;

  // Slide along X at start.y
  const maxScan = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  for (let dx = 1; dx < maxScan; dx++) {
    for (const nx of [start.x + dx, start.x - dx]) {
      if (nx < bounds.minX || nx > bounds.maxX) continue;
      const candidate = [] as {x:number;y:number}[];
      const xStep = start.x < nx ? 1 : -1;
      for (let x = start.x; x !== nx; x += xStep) candidate.push({ x, y: start.y });
      candidate.push({ x: nx, y: start.y });
      const yStep = start.y < end.y ? 1 : -1;
      for (let y = start.y; y !== end.y; y += yStep) candidate.push({ x: nx, y });
      for (let x = nx; x !== end.x; x += (end.x < nx ? -1 : 1)) candidate.push({ x, y: end.y });
      candidate.push({ x: end.x, y: end.y });
      if (validateLPath(candidate, rooms, start, end, allowRoomIds)) return candidate;
    }
  }

  // Slide along Y at start.x
  for (let dy = 1; dy < maxScan; dy++) {
    for (const ny of [start.y + dy, start.y - dy]) {
      if (ny < bounds.minY || ny > bounds.maxY) continue;
      const candidate = [] as {x:number;y:number}[];
      const yStep = start.y < ny ? 1 : -1;
      for (let y = start.y; y !== ny; y += yStep) candidate.push({ x: start.x, y });
      candidate.push({ x: start.x, y: ny });
      const xStep = start.x < end.x ? 1 : -1;
      for (let x = start.x; x !== end.x; x += xStep) candidate.push({ x, y: ny });
      for (let y = ny; y !== end.y; y += (end.y < ny ? -1 : 1)) candidate.push({ x: end.x, y });
      candidate.push({ x: end.x, y: end.y });
      if (validateLPath(candidate, rooms, start, end, allowRoomIds)) return candidate;
    }
  }

  return null;
}

// Snap a door position to the nearest integer grid tile just outside the room
function normalizeDoorPoint(room: Room, p: { x: number; y: number }): { x: number; y: number } {
  // For rectangular rooms, the door point should already be just outside.
  if (room.shape === 'rectangular' || !room.shapePoints) {
    return { x: Math.round(p.x), y: Math.round(p.y) };
  }

  // For shaped rooms, project outward along the wall normal to the nearest grid cell
  const shape = room.shapePoints!;
  let closest = { i: 0, d: Infinity, p: { x: p.x, y: p.y } };
  for (let i = 0; i < shape.length; i++) {
    const a = shape[i];
    const b = shape[(i + 1) % shape.length];
    const d = distanceFromPointToLineSegment(p, a, b);
    if (d < closest.d) {
      // Find closest point on edge
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx*dx + dy*dy;
      let t = len2 > 0 ? ((p.x - a.x)*dx + (p.y - a.y)*dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      closest = { i, d, p: { x: a.x + t*dx, y: a.y + t*dy } };
    }
  }
  const a = shape[closest.i];
  const b = shape[(closest.i + 1) % shape.length];
  // Edge direction
  const ex = b.x - a.x, ey = b.y - a.y;
  // Normal candidates
  let nx = -ey, ny = ex; // rotate 90°
  const nlen = Math.hypot(nx, ny) || 1;
  nx /= nlen; ny /= nlen;
  // Ensure normal points OUTWARD (away from room center)
  const bounds = roomShapeService.getRoomBounds(room);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const vx = closest.p.x - cx, vy = closest.p.y - cy;
  if (nx*vx + ny*vy < 0) { nx = -nx; ny = -ny; }
  // Step outward to nearest integer grid cell
  let rx = Math.round(closest.p.x + nx);
  let ry = Math.round(closest.p.y + ny);
  // If rounding still lands inside, step further
  let steps = 0;
  while (roomShapeService.isPointInRoom(room, rx, ry) && steps < 3) {
    rx = Math.round(rx + nx);
    ry = Math.round(ry + ny);
    steps++;
  }
  if (DEBUG && roomShapeService.isPointInRoom(room, rx, ry)) {
    console.warn(`[corridors] normalizeDoorPoint still inside shaped room ${room.id} at (${rx},${ry}) after ${steps} steps`);
  }
  return { x: rx, y: ry };
}

// Determine outward normal direction for a door point (axis-aligned unit for rectangular, approximate for shaped)
function outwardNormal(room: Room, p: { x: number; y: number }): { x: 0|1|-1; y: 0|1|-1 } {
  if (room.shape === 'rectangular' || !room.shapePoints) {
    if (p.x === room.x - 1) return { x: -1, y: 0 };
    if (p.x === room.x + room.w) return { x: 1, y: 0 };
    if (p.y === room.y - 1) return { x: 0, y: -1 };
    if (p.y === room.y + room.h) return { x: 0, y: 1 };
    // Fallback: choose the closest side
    const dl = Math.abs(p.x - (room.x - 1));
    const dr = Math.abs(p.x - (room.x + room.w));
    const dt = Math.abs(p.y - (room.y - 1));
    const db = Math.abs(p.y - (room.y + room.h));
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) return { x: -1, y: 0 };
    if (m === dr) return { x: 1, y: 0 };
    if (m === dt) return { x: 0, y: -1 };
    return { x: 0, y: 1 };
  }
  // For shaped rooms, approximate with vector from center to door point, snapped to axis
  const b = roomShapeService.getRoomBounds(room);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const vx = p.x - cx, vy = p.y - cy;
  if (Math.abs(vx) > Math.abs(vy)) return { x: (vx >= 0 ? 1 : -1), y: 0 };
  return { x: 0, y: (vy >= 0 ? 1 : -1) };
}

// Choose L-variant whose last step approaches perpendicular to the room wall (i.e., opposite of outward normal)
function chooseLVariantForDoor(paths: Array<{x:number;y:number}[]>, end: {x:number;y:number}, normal: {x:0|1|-1;y:0|1|-1}): {x:number;y:number}[] {
  const desired = { x: -normal.x, y: -normal.y };
  let best: {x:number;y:number}[] | null = null;
  for (const path of paths) {
    if (path.length < 2) continue;
    const a = path[path.length - 2];
    const b = path[path.length - 1];
    const step = { x: Math.sign(b.x - a.x) as 0|1|-1, y: Math.sign(b.y - a.y) as 0|1|-1 };
    if ((desired.x !== 0 && step.x === desired.x && step.y === 0) || (desired.y !== 0 && step.y === desired.y && step.x === 0)) {
      best = path; break;
    }
  }
  return best || paths[0];
}

// Ensure a path is orthogonal and contiguous by expanding any gaps into unit steps
function enforceOrthContiguous(path: {x:number;y:number}[]): {x:number;y:number}[] {
  if (path.length === 0) return path;
  const out: {x:number;y:number}[] = [];
  out.push({ x: path[0].x, y: path[0].y });
  for (let i = 1; i < path.length; i++) {
    const prev = out[out.length - 1];
    const cur = path[i];
    let dx = cur.x - prev.x;
    let dy = cur.y - prev.y;
    // Horizontal run
    while (dx !== 0) {
      const stepX = dx > 0 ? 1 : -1;
      out.push({ x: out[out.length - 1].x + stepX, y: out[out.length - 1].y });
      dx -= stepX;
    }
    // Vertical run
    while (dy !== 0) {
      const stepY = dy > 0 ? 1 : -1;
      out.push({ x: out[out.length - 1].x, y: out[out.length - 1].y + stepY });
      dy -= stepY;
    }
  }
  return out;
}

/**
 * A* pathfinding using the pathfinding library with cost grid support
 * Finds optimal path while avoiding high-cost areas (like room interiors)
 */
function findPathAStar(
  start: { x: number; y: number },
  goal: { x: number; y: number },
  costGrid: number[][],
  width: number,
  height: number
): { x: number; y: number }[] {
  // Convert cost grid to binary grid for pathfinding library (0 = walkable, 1 = blocked)
  const grid = new (PF as any).Grid(width, height);
  
  // Set walkability based on cost (high cost areas become less walkable)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cost = costGrid[y][x];
      // Convert high costs to blocked tiles, but allow some path through room edges
      const isBlocked = cost > 15; // Block very high cost areas
      grid.setWalkableAt(x, y, !isBlocked);
    }
  }
  
  // Create A* finder with Manhattan heuristic (matches our original heuristic)
  const finder = new (PF as any).AStarFinder({
    allowDiagonal: false,
    heuristic: (PF as any).Heuristic.manhattan
  });
  
  // Find path using optimized A* with heap-based priority queue
  const path = finder.findPath(start.x, start.y, goal.x, goal.y, grid.clone());
  
  // Convert path format to our expected format
  if (path.length > 0) {
    return path.map((point: number[]) => ({ x: point[0], y: point[1] }));
  }
  
  // No path found, fallback to Manhattan path
  return manhattanPath(start, goal, () => 0.5);
}

/**
 * Generate corridors connecting rooms using either enhanced pathfinding or Manhattan fallback
 */
export function connectRooms(
  rooms: Room[], 
  r: () => number, 
  options: EnhancedPathfindingOptions = { algorithm: 'manhattan', usePathfindingLib: false }
): Corridor[] {
  if (rooms.length < 2) return [];
  
  // Calculate room centers for MST generation
  const centers = rooms.map(rm => ({ 
    x: rm.x + Math.floor(rm.w/2), 
    y: rm.y + Math.floor(rm.h/2) 
  }));
  
  // Generate edges using Kruskal's algorithm for minimum spanning tree
  const edges: Edge[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const d = Math.abs(centers[i].x - centers[j].x) + Math.abs(centers[i].y - centers[j].y);
      edges.push({ a: i, b: j, d });
    }
  }
  edges.sort((e1, e2) => e1.d - e2.d);

  const unionFind = createSimpleUnionFind(rooms.length);
  const corridors: Corridor[] = [];
  
  // Try enhanced pathfinding if available and enabled
  return connectWithEnhancedPathfinding(rooms, r, options, edges, centers);
}

function manhattanPath(a:{x:number;y:number}, b:{x:number;y:number}, r: () => number) {
  const path = [] as {x:number;y:number}[];
  const xStep = a.x < b.x ? 1 : -1;
  const yStep = a.y < b.y ? 1 : -1;
  // Randomize whether to move horizontally or vertically first
  if (r() < 0.5) {
    for (let x=a.x; x!==b.x; x+=xStep) path.push({x, y:a.y});
    for (let y=a.y; y!==b.y; y+=yStep) path.push({x:b.x, y});
  } else {
    for (let y=a.y; y!==b.y; y+=yStep) path.push({x:a.x, y});
    for (let x=a.x; x!==b.x; x+=xStep) path.push({x, y:b.y});
  }
  path.push({x:b.x, y:b.y});
  return path;
}

function trimPath(
  path: { x: number; y: number }[],
  a: Room,
  b: Room,
): { x: number; y: number }[] {
  const inside = (p: { x: number; y: number }, r: Room): boolean =>
    p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
  
  // Remove points inside rooms
  while (path.length && inside(path[0], a)) path.shift();
  while (path.length && inside(path[path.length - 1], b)) path.pop();
  
  if (path.length === 0) return path;
  
  // Ensure start point is on room A's edge
  const start = path[0];
  const startEdgePoint = getClosestEdgePoint(start, a);
  path[0] = startEdgePoint;
  
  // Ensure end point is on room B's edge
  const end = path[path.length - 1];
  const endEdgePoint = getClosestEdgePoint(end, b);
  path[path.length - 1] = endEdgePoint;
  
  return path;
}

function getClosestEdgePoint(point: { x: number; y: number }, room: Room): { x: number; y: number } {
  const { x, y } = point;
  const { x: rx, y: ry, w: rw, h: rh } = room;
  
  // Calculate distances to each edge
  const distToLeft = Math.abs(x - rx);
  const distToRight = Math.abs(x - (rx + rw));
  const distToTop = Math.abs(y - ry);
  const distToBottom = Math.abs(y - (ry + rh));
  
  const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
  
  // Return point on the closest edge
  if (minDist === distToLeft && y >= ry && y < ry + rh) {
    return { x: rx, y };
  } else if (minDist === distToRight && y >= ry && y < ry + rh) {
    return { x: rx + rw, y };
  } else if (minDist === distToTop && x >= rx && x < rx + rw) {
    return { x, y: ry };
  } else if (minDist === distToBottom && x >= rx && x < rx + rw) {
    return { x, y: ry + rh };
  } else {
    // Point is at a corner, pick closest corner
    const corners = [
      { x: rx, y: ry },           // Top-left
      { x: rx + rw, y: ry },      // Top-right
      { x: rx, y: ry + rh },      // Bottom-left
      { x: rx + rw, y: ry + rh }  // Bottom-right
    ];
    
    let closestCorner = corners[0];
    let minCornerDist = Math.abs(x - corners[0].x) + Math.abs(y - corners[0].y);
    
    for (const corner of corners.slice(1)) {
      const dist = Math.abs(x - corner.x) + Math.abs(y - corner.y);
      if (dist < minCornerDist) {
        minCornerDist = dist;
        closestCorner = corner;
      }
    }
    
    return closestCorner;
  }
}

/**
 * Connect rooms using enhanced PathFinding.js algorithms
 */
function connectWithEnhancedPathfinding(
  rooms: Room[], 
  r: () => number, 
  options: EnhancedPathfindingOptions,
  edges: Edge[],
  centers: { x: number; y: number }[]
): Corridor[] {
  // Calculate dungeon bounds with padding
  const minX = Math.min(...rooms.map(r => r.x)) - 5;
  const maxX = Math.max(...rooms.map(r => r.x + r.w)) + 5;
  const minY = Math.min(...rooms.map(r => r.y)) - 5;
  const maxY = Math.max(...rooms.map(r => r.y + r.h)) + 5;
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Offset rooms to grid coordinates
  const offsetRooms = rooms.map(room => ({
    ...room,
    x: room.x - minX,
    y: room.y - minY
  }));

  const unionFind = createSimpleUnionFind(rooms.length);
  const corridors: Corridor[] = [];
  
  for (const e of edges) {
    if (!unionFind.connected(e.a, e.b)) {
      unionFind.union(e.a, e.b);
      
      const from = rooms[e.a].id;
      const to = rooms[e.b].id;
      
      // Calculate optimal door connection points
      const doorPoints = calculateDoorConnectionPoints(rooms[e.a], rooms[e.b]);
      
      // Normalize door points to integer grid just outside room
      const normStart = normalizeDoorPoint(rooms[e.a], doorPoints.start);
      const normEnd = normalizeDoorPoint(rooms[e.b], doorPoints.end);
      // Offset door points for grid coordinates
      const startPoint = { x: normStart.x - minX, y: normStart.y - minY };
      const endPoint = { x: normEnd.x - minX, y: normEnd.y - minY };
      
      let path: { x: number; y: number }[] = [];
      
      // If requested, try classic L-shape first (never cuts rooms)
      if (options.preferLShape || options.algorithm === 'manhattan') {
        const [hv, vh] = buildLPaths(normStart, normEnd);
        const allowIds = [rooms[e.a].id, rooms[e.b].id];
        const candidates = [] as {x:number;y:number}[][];
        if (validateLPath(hv, rooms, normStart, normEnd, allowIds)) candidates.push(hv);
        if (validateLPath(vh, rooms, normStart, normEnd, allowIds)) candidates.push(vh);
        if (candidates.length) {
          const n = outwardNormal(rooms[e.b], normEnd);
          path = chooseLVariantForDoor(candidates, normEnd, n);
        }
      }

      // If L-shape not used or invalid, attempt elbow sliding to keep orthogonal
      if (path.length === 0) {
        const bounds = { minX, maxX, minY, maxY };
        const allowIds = [rooms[e.a].id, rooms[e.b].id];
        const orth = findOrthogonalPath(normStart, normEnd, rooms, allowIds, bounds);
        if (orth) {
          path = orth;
        }
      }

      // If still no path, route with PathFinding.js (orthogonal grid), keep endpoints fixed
      if (path.length === 0) {
        try {
          const routed = findPathWithPathfindingJS(
            startPoint,
            endPoint,
            offsetRooms,
            width,
            height,
            options.algorithm === 'manhattan' ? 'astar' : options.algorithm
          );
          path = routed.map(p => ({ x: p.x + minX, y: p.y + minY }));
          if (path.length > 0) {
            path[0] = normStart;
            path[path.length - 1] = normEnd;
          }
        } catch (error) {
          // As a last resort, emit the straight segment
          path = [normStart, normEnd];
        }
      }

      // Final guard: ensure orthogonal contiguity between successive nodes
      if (path.length >= 2) {
        path = enforceOrthContiguous(path);
        // Re-anchor endpoints (in case of expansion)
        path[0] = normStart;
        path[path.length - 1] = normEnd;
      }
      
      corridors.push({ 
        id: id('cor', r), 
        from, 
        to, 
        path,
        doorStart: normStart,
        doorEnd: normEnd
      });
    }
  }
  
  return corridors;
}

// Removed classic center-to-center Manhattan in favor of L-preferred + A* routing

/**
 * Create a cost grid for PathFinding.js (0 = walkable, 1 = blocked)
 */
function createPathfindingGrid(rooms: Room[], width: number, height: number): number[][] {
  // Initialize all as walkable
  const grid: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  for (const room of rooms) {
    if (room.shape !== 'rectangular' && room.shapePoints) {
      // Shape-aware blocking: iterate over room bounds
      const bounds = roomShapeService.getRoomBounds(room);
      const minX = Math.max(0, Math.floor(bounds.minX));
      const maxX = Math.min(width - 1, Math.ceil(bounds.maxX));
      const minY = Math.max(0, Math.floor(bounds.minY));
      const maxY = Math.min(height - 1, Math.ceil(bounds.maxY));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (roomShapeService.isPointInRoom(room, x, y)) {
            // Keep border walkable to allow door connection
            const onBorder = (x === minX || x === maxX || y === minY || y === maxY) ||
              // Use precise border check for shaped rooms
              true && isPointOnLineSegmentRoomBorder(room, x, y);
            if (!onBorder) grid[y][x] = 1;
          }
        }
      }
    } else {
      // Rectangular rooms: block interior, leave 1-tile border
      for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        if (y < 0 || y >= height) continue;
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
          if (x < 0 || x >= width) continue;
          grid[y][x] = 1;
        }
      }
    }
  }

  return grid;
}

// Precise border detection wrapper for shaped rooms
function isPointOnLineSegmentRoomBorder(room: Room, x: number, y: number): boolean {
  // For shaped rooms, consider a point border if any neighbor is outside
  if (!roomShapeService.isPointInRoom(room, x, y)) return false;
  const neighbors = [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ];
  return neighbors.some(n => !roomShapeService.isPointInRoom(room, n.x, n.y));
}

/**
 * Enhanced pathfinding using PathFinding.js library
 */
function findPathWithPathfindingJS(
  start: { x: number; y: number },
  goal: { x: number; y: number },
  rooms: Room[],
  width: number,
  height: number,
  algorithm: 'astar' | 'jumppoint' | 'dijkstra' | 'manhattan' = 'astar'
): { x: number; y: number }[] {
  const costGrid = createPathfindingGrid(rooms, width, height);
  
  // Ensure start and goal are walkable
  if (start.x >= 0 && start.x < width && start.y >= 0 && start.y < height) {
    costGrid[start.y][start.x] = 0;
  }
  if (goal.x >= 0 && goal.x < width && goal.y >= 0 && goal.y < height) {
    costGrid[goal.y][goal.x] = 0;
  }
  
  const grid = new (PF as any).Grid(costGrid);
  
  // Select pathfinding algorithm
  let finder;
  switch (algorithm) {
    case 'jumppoint':
      finder = new (PF as any).JumpPointFinder({
        diagonalMovement: (PF as any).DiagonalMovement.Never
      });
      break;
    case 'dijkstra':
      finder = new (PF as any).DijkstraFinder({
        diagonalMovement: (PF as any).DiagonalMovement.Never
      });
      break;
    default: // 'astar'
      finder = new (PF as any).AStarFinder({
        diagonalMovement: (PF as any).DiagonalMovement.Never,
        heuristic: (PF as any).Heuristic.manhattan
      });
  }
  
  const path = finder.findPath(start.x, start.y, goal.x, goal.y, grid);
  
  if (path.length === 0) {
    throw new Error(`No path found from (${start.x},${start.y}) to (${goal.x},${goal.y})`);
  }
  
  return path.map(([x, y]: [number, number]) => ({ x, y }));
}
