import { Corridor, Room } from '../core/types';
import { id } from './random';

type Edge = { a: number; b: number; d: number };

export function connectRooms(rooms: Room[]): Corridor[] {
  if (rooms.length < 2) return [];
  const centers = rooms.map(r => ({ x: r.x + Math.floor(r.w/2), y: r.y + Math.floor(r.h/2) }));
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
      const from = rooms[e.a].id, to = rooms[e.b].id;
      const path = manhattanPath(centers[e.a], centers[e.b]);
      corridors.push({ id: id('cor'), from, to, path });
    }
  }
  return corridors;
}

function manhattanPath(a:{x:number;y:number}, b:{x:number;y:number}) {
  const path = [];
  const xStep = a.x < b.x ? 1 : -1;
  for (let x=a.x; x!==b.x; x+=xStep) path.push({x, y:a.y});
  const yStep = a.y < b.y ? 1 : -1;
  for (let y=a.y; y!==b.y; y+=yStep) path.push({x:b.x, y});
  path.push({x:b.x, y:b.y});
  return path;
}
