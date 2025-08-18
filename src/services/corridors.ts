import { Corridor, Room } from '../core/types';
import { id } from './random';

type Edge = { a: number; b: number; d: number };

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
      let path = manhattanPath(centers[e.a], centers[e.b], r);
      path = trimPath(path, rooms[e.a], rooms[e.b]);
      corridors.push({ id: id('cor', r), from, to, path });
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
