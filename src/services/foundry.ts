import { Dungeon } from "../core/types";

export interface FoundryWall {
  c: [number, number, number, number];
}

export interface FoundryScene {
  name: string;
  walls: FoundryWall[];
  width: number;
  height: number;
  grid: number;
}

/**
 * Convert a dungeon into a simple FoundryVTT Scene JSON. Each room and
 * corridor tile becomes floor space with surrounding walls. The scene uses a
 * fixed grid size.
 */
export function exportFoundry(d: Dungeon, grid = 100): FoundryScene {
  const cells: { x: number; y: number }[] = [];
  for (const r of d.rooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        cells.push({ x, y });
      }
    }
  }
  for (const c of d.corridors) {
    for (const p of c.path) cells.push(p);
  }

  const maxX = Math.max(0, ...cells.map((p) => p.x)) + 1;
  const maxY = Math.max(0, ...cells.map((p) => p.y)) + 1;

  const edges = new Set<string>();
  const addEdge = (x1: number, y1: number, x2: number, y2: number) => {
    const key = `${x1},${y1},${x2},${y2}`;
    const rev = `${x2},${y2},${x1},${y1}`;
    if (edges.has(rev)) edges.delete(rev);
    else edges.add(key);
  };

  for (const cell of cells) {
    const { x, y } = cell;
    addEdge(x, y, x + 1, y);
    addEdge(x + 1, y, x + 1, y + 1);
    addEdge(x + 1, y + 1, x, y + 1);
    addEdge(x, y + 1, x, y);
  }

  const walls: FoundryWall[] = Array.from(edges).map((e) => {
    const [x1, y1, x2, y2] = e.split(",").map(Number);
    return { c: [x1 * grid, y1 * grid, x2 * grid, y2 * grid] };
  });

  return {
    name: "Generated Dungeon",
    walls,
    width: maxX * grid,
    height: maxY * grid,
    grid,
  };
}
