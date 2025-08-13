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
  while (path.length && inside(path[0], a)) path.shift();
  while (path.length && inside(path[path.length - 1], b)) path.pop();
  return path;
}
