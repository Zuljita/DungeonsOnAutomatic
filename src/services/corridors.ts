import { Corridor, Room } from '../core/types';
import { id } from './random';
import { roomShapeService } from './room-shapes';

// Enhanced pathfinding options
export interface EnhancedPathfindingOptions {
  algorithm: 'astar' | 'jumppoint' | 'dijkstra' | 'manhattan';
  usePathfindingLib: boolean;
}

// Try to load PathFinding.js library if available
let PF: any = null;
try {
  // In browser environment, this might fail gracefully
  if (typeof window === 'undefined') {
    // Node.js environment - try to load pathfinding
    PF = eval('require')('pathfinding');
  }
} catch (error) {
  console.log('PathFinding.js library not available, using fallback algorithms');
}

type Edge = { a: number; b: number; d: number };

// A* pathfinding node
interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total cost (g + h)
  parent?: PathNode;
}

// Priority queue for A* pathfinding
class PriorityQueue {
  private items: PathNode[] = [];

  enqueue(node: PathNode): void {
    this.items.push(node);
    this.items.sort((a, b) => a.f - b.f);
  }

  dequeue(): PathNode | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
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

/**
 * A* pathfinding with cost grid support
 * Finds optimal path while avoiding high-cost areas (like room interiors)
 */
function findPathAStar(
  start: { x: number; y: number },
  goal: { x: number; y: number },
  costGrid: number[][],
  width: number,
  height: number
): { x: number; y: number }[] {
  const openSet = new PriorityQueue();
  const closedSet = new Set<string>();
  
  // Heuristic function (Manhattan distance)
  const heuristic = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  };
  
  // Create start node
  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, goal),
    f: heuristic(start, goal)
  };
  
  openSet.enqueue(startNode);
  
  while (!openSet.isEmpty()) {
    const currentNode = openSet.dequeue()!;
    const nodeKey = `${currentNode.x},${currentNode.y}`;
    
    // Goal reached
    if (currentNode.x === goal.x && currentNode.y === goal.y) {
      const path: { x: number; y: number }[] = [];
      let current: PathNode | undefined = currentNode;
      while (current) {
        path.unshift({ x: current.x, y: current.y });
        current = current.parent;
      }
      return path;
    }
    
    closedSet.add(nodeKey);
    
    // Check neighbors (4-directional movement)
    const neighbors = [
      { x: currentNode.x + 1, y: currentNode.y },
      { x: currentNode.x - 1, y: currentNode.y },
      { x: currentNode.x, y: currentNode.y + 1 },
      { x: currentNode.x, y: currentNode.y - 1 }
    ];
    
    for (const neighbor of neighbors) {
      // Skip if out of bounds
      if (neighbor.x < 0 || neighbor.x >= width || neighbor.y < 0 || neighbor.y >= height) {
        continue;
      }
      
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      
      // Skip if already evaluated
      if (closedSet.has(neighborKey)) {
        continue;
      }
      
      // Calculate cost using the cost grid
      const moveCost = costGrid[neighbor.y][neighbor.x];
      const tentativeG = currentNode.g + moveCost;
      
      const neighborNode: PathNode = {
        x: neighbor.x,
        y: neighbor.y,
        g: tentativeG,
        h: heuristic(neighbor, goal),
        f: tentativeG + heuristic(neighbor, goal),
        parent: currentNode
      };
      
      openSet.enqueue(neighborNode);
    }
  }
  
  // No path found, fallback to Manhattan path
  return manhattanPath(start, goal, () => 0.5);
}

export function connectRooms(rooms: Room[], r: () => number): Corridor[] {
  if (rooms.length < 2) return [];
  const centers = rooms.map(rm => ({ x: rm.x + Math.floor(rm.w/2), y: rm.y + Math.floor(rm.h/2) }));
  const edges: Edge[] = [];
  for (let i=0;i<rooms.length;i++) {
    for (let j=i+1;j<rooms.length;j++) {
      const d = Math.abs(centers[i].x - centers[j].x) + Math.abs(centers[i].y - centers[j].y);
      edges.push({ a: i, b: j, d });
    }
  }
  edges.sort((e1, e2) => e1.d - e2.d);

  // Kruskal
  const parent = Array.from({ length: rooms.length }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const unite = (a: number, b: number): void => {
    parent[find(a)] = find(b);
  };
  const corridors: Corridor[] = [];
  for (const e of edges) {
    if (find(e.a) !== find(e.b)) {
      unite(e.a, e.b);
      const from = rooms[e.a].id,
        to = rooms[e.b].id;
      
      // Calculate door connection points for classic pathfinding too
      const doorPoints = calculateDoorConnectionPoints(rooms[e.a], rooms[e.b]);
      
      let path = manhattanPath(centers[e.a], centers[e.b], r);
      path = trimPath(path, rooms[e.a], rooms[e.b]);
      
      // Ensure path starts and ends at door points
      if (path.length > 0) {
        path[0] = doorPoints.start;
        path[path.length - 1] = doorPoints.end;
      }
      
      corridors.push({ 
        id: id('cor', r), 
        from, 
        to, 
        path,
        doorStart: doorPoints.start,
        doorEnd: doorPoints.end
      });
    }
  }
  return corridors;
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
 * Enhanced corridor generation using PathFinding.js library when available
 */
export function connectRoomsEnhanced(
  rooms: Room[], 
  r: () => number, 
  options: EnhancedPathfindingOptions = { algorithm: 'astar', usePathfindingLib: true }
): Corridor[] {
  if (rooms.length < 2) return [];
  
  // Fall back to original algorithm if PathFinding.js not available or disabled
  if (!options.usePathfindingLib || !PF || options.algorithm === 'manhattan') {
    return connectRooms(rooms, r);
  }
  
  console.log(`🚀 Using enhanced door-to-door pathfinding: ${options.algorithm}`);
  
  // Calculate room centers for MST generation
  const centers = rooms.map(rm => ({ 
    x: rm.x + Math.floor(rm.w/2), 
    y: rm.y + Math.floor(rm.h/2) 
  }));
  
  // Calculate dungeon bounds with padding
  const minX = Math.min(...rooms.map(r => r.x)) - 5;
  const maxX = Math.max(...rooms.map(r => r.x + r.w)) + 5;
  const minY = Math.min(...rooms.map(r => r.y)) - 5;
  const maxY = Math.max(...rooms.map(r => r.y + r.h)) + 5;
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Offset everything to grid coordinates
  const offsetCenters = centers.map(c => ({
    x: c.x - minX,
    y: c.y - minY
  }));
  
  const offsetRooms = rooms.map(room => ({
    ...room,
    x: room.x - minX,
    y: room.y - minY
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

  const parent = Array.from({ length: rooms.length }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const unite = (a: number, b: number): void => {
    parent[find(a)] = find(b);
  };
  
  const corridors: Corridor[] = [];
  
  for (const e of edges) {
    if (find(e.a) !== find(e.b)) {
      unite(e.a, e.b);
      
      const from = rooms[e.a].id;
      const to = rooms[e.b].id;
      
      // Calculate optimal door connection points
      const doorPoints = calculateDoorConnectionPoints(rooms[e.a], rooms[e.b]);
      
      // Offset door points for grid coordinates
      const startPoint = { x: doorPoints.start.x - minX, y: doorPoints.start.y - minY };
      const endPoint = { x: doorPoints.end.x - minX, y: doorPoints.end.y - minY };
      
      let path: { x: number; y: number }[];
      
      try {
        // Use PathFinding.js for enhanced door-to-door pathfinding
        path = findPathWithPathfindingJS(
          startPoint,
          endPoint,
          offsetRooms,
          width,
          height,
          options.algorithm
        );
        
        // Convert back to original coordinates
        path = path.map(p => ({ x: p.x + minX, y: p.y + minY }));
        
        // Ensure path starts and ends at the door points
        if (path.length > 0) {
          path[0] = doorPoints.start;
          path[path.length - 1] = doorPoints.end;
        }
      } catch (error) {
        console.warn('PathFinding.js failed, falling back to Manhattan:', (error as Error).message);
        // Fallback to door-aware Manhattan path
        path = [doorPoints.start, doorPoints.end];
      }
      
      corridors.push({ 
        id: id('cor', r), 
        from, 
        to, 
        path,
        doorStart: doorPoints.start,
        doorEnd: doorPoints.end
      });
    }
  }
  
  return corridors;
}

/**
 * Create a cost grid for PathFinding.js (0 = walkable, 1 = blocked)
 */
function createPathfindingGrid(rooms: Room[], width: number, height: number): number[][] {
  // Initialize all as walkable
  const grid: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  
  // Block room interiors but keep edges walkable for door placement
  for (const room of rooms) {
    // Block room interiors (leave 1-tile border for doors)
    for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
      for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          grid[y][x] = 1; // Block interior
        }
      }
    }
  }
  
  return grid;
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
  algorithm: 'astar' | 'jumppoint' | 'dijkstra' = 'astar'
): { x: number; y: number }[] {
  const costGrid = createPathfindingGrid(rooms, width, height);
  
  // Ensure start and goal are walkable
  if (start.x >= 0 && start.x < width && start.y >= 0 && start.y < height) {
    costGrid[start.y][start.x] = 0;
  }
  if (goal.x >= 0 && goal.x < width && goal.y >= 0 && goal.y < height) {
    costGrid[goal.y][goal.x] = 0;
  }
  
  const grid = new PF.Grid(costGrid);
  
  // Select pathfinding algorithm
  let finder;
  switch (algorithm) {
    case 'jumppoint':
      finder = new PF.JumpPointFinder({
        diagonalMovement: PF.DiagonalMovement.Never
      });
      break;
    case 'dijkstra':
      finder = new PF.DijkstraFinder({
        diagonalMovement: PF.DiagonalMovement.Never
      });
      break;
    default: // 'astar'
      finder = new PF.AStarFinder({
        diagonalMovement: PF.DiagonalMovement.Never,
        heuristic: PF.Heuristic.manhattan
      });
  }
  
  const path = finder.findPath(start.x, start.y, goal.x, goal.y, grid);
  
  if (path.length === 0) {
    throw new Error(`No path found from (${start.x},${start.y}) to (${goal.x},${goal.y})`);
  }
  
  return path.map(([x, y]: [number, number]) => ({ x, y }));
}
