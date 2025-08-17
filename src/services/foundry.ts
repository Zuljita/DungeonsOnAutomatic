import { Dungeon, Room } from "../core/types";

export interface FoundryWall {
  c: [number, number, number, number];
}

export interface FoundryDoor {
  c: [number, number, number, number];
}

export interface FoundryScene {
  name: string;
  walls: FoundryWall[];
  doors: FoundryDoor[];
  width: number;
  height: number;
  grid: number;
}

/**
 * Convert a dungeon into a simple FoundryVTT Scene JSON. Each room and
 * corridor tile becomes floor space with surrounding walls. Door segments are
 * exported separately so virtual tabletops can render openable passages. The
 * scene uses a fixed grid size.
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

  const doorEdge = (room: Room, tile: { x: number; y: number }, pathDirection?: { x: number; y: number }) => {
    // Handle case where corridor point is outside room (original logic)
    if (tile.x < room.x) return [room.x, tile.y, room.x, tile.y + 1] as const;
    if (tile.x >= room.x + room.w)
      return [room.x + room.w, tile.y, room.x + room.w, tile.y + 1] as const;
    if (tile.y < room.y) return [tile.x, room.y, tile.x + 1, room.y] as const;
    if (tile.y >= room.y + room.h)
      return [tile.x, room.y + room.h, tile.x + 1, room.y + room.h] as const;
    
    // Handle case where corridor point is inside room
    // Find the closest edge of the room to place the door
    const distToLeft = tile.x - room.x;
    const distToRight = (room.x + room.w - 1) - tile.x;
    const distToTop = tile.y - room.y;
    const distToBottom = (room.y + room.h - 1) - tile.y;
    
    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
    
    if (minDist === distToLeft && distToLeft >= 0) {
      // Door on left edge
      return [room.x, tile.y, room.x, tile.y + 1] as const;
    } else if (minDist === distToRight && distToRight >= 0) {
      // Door on right edge
      return [room.x + room.w, tile.y, room.x + room.w, tile.y + 1] as const;
    } else if (minDist === distToTop && distToTop >= 0) {
      // Door on top edge
      return [tile.x, room.y, tile.x + 1, room.y] as const;
    } else if (minDist === distToBottom && distToBottom >= 0) {
      // Door on bottom edge
      return [tile.x, room.y + room.h, tile.x + 1, room.y + room.h] as const;
    }
    
    return null;
  };

  const doorSegments: [number, number, number, number][] = [];
  for (const c of d.corridors) {
    if (c.path.length > 0) {
      const start = c.path[0];
      const end = c.path[c.path.length - 1];
      const fromRoom = d.rooms.find((r) => r.id === c.from);
      const toRoom = d.rooms.find((r) => r.id === c.to);
      if (fromRoom) {
        const seg = doorEdge(fromRoom, start);
        if (seg) doorSegments.push(seg);
      }
      if (toRoom) {
        const seg = doorEdge(toRoom, end);
        if (seg) doorSegments.push(seg);
      }
    }
  }

  const doors = doorSegments.map(([x1, y1, x2, y2]) => ({
    c: [x1 * grid, y1 * grid, x2 * grid, y2 * grid],
  }));

  const walls: FoundryWall[] = Array.from(edges).map((e) => {
    const [x1, y1, x2, y2] = e.split(",").map(Number);
    return { c: [x1 * grid, y1 * grid, x2 * grid, y2 * grid] };
  });

  return {
    name: "Generated Dungeon",
    walls,
    doors,
    width: maxX * grid,
    height: maxY * grid,
    grid,
  };
}
