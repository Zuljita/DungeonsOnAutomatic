import { Dungeon, Room } from "../core/types";
import { roomShapeService } from "./room-shapes";

export interface RenderTheme {
  /** Color of the SVG background */
  background: string;
  /** Fill color for corridor tiles */
  corridorFill: string;
  /** Fill color for room rectangles */
  roomFill: string;
  /** Stroke color for room rectangles */
  roomStroke: string;
  /** Color for room numbering text */
  textFill: string;
}

export const lightTheme: RenderTheme = {
  background: "#ffffff",
  corridorFill: "#cccccc",
  roomFill: "#ffffff",
  roomStroke: "#000000",
  textFill: "#000000",
};

export const darkTheme: RenderTheme = {
  background: "#000000",
  corridorFill: "#555555",
  roomFill: "#222222",
  roomStroke: "#ffffff",
  textFill: "#ffffff",
};

/**
 * Render a simple ASCII map of the dungeon. Rooms are drawn with '#' borders
 * and '.' interiors; corridor tiles are marked with '+'. Door locations are
 * marked with 'D' on the corridor tile adjacent to the room. The map is
 * tightly cropped to the extents of the dungeon geometry.
 */
export function renderAscii(d: Dungeon): string {
  const points: { x: number; y: number }[] = [];
  for (const r of d.rooms) {
    if (r.shape === 'rectangular' || !r.shapePoints) {
      points.push({ x: r.x + r.w, y: r.y + r.h });
    } else {
      // For shaped rooms, use the room bounds
      const bounds = roomShapeService.getRoomBounds(r);
      points.push({ x: Math.ceil(bounds.maxX), y: Math.ceil(bounds.maxY) });
    }
  }
  for (const c of d.corridors) {
    for (const p of c.path) points.push(p);
  }
  const maxX = Math.max(0, ...points.map((p) => p.x)) + 1;
  const maxY = Math.max(0, ...points.map((p) => p.y)) + 1;
  const grid: string[][] = Array.from({ length: maxY }, () => Array(maxX).fill(" "));

  for (const r of d.rooms) {
    if (r.shape === 'rectangular' || !r.shapePoints) {
      // Use original rectangular rendering for rectangular rooms
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          const border = x === r.x || x === r.x + r.w - 1 || y === r.y || y === r.y + r.h - 1;
          grid[y][x] = border ? "#" : ".";
        }
      }
    } else {
      // Use shape-aware rendering for non-rectangular rooms
      const bounds = roomShapeService.getRoomBounds(r);
      for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y++) {
        for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x++) {
          if (y >= 0 && y < maxY && x >= 0 && x < maxX) {
            if (roomShapeService.isPointInRoom(r, x, y)) {
              // Check if this is a border point by testing adjacent points
              const isBorder = !roomShapeService.isPointInRoom(r, x-1, y) ||
                              !roomShapeService.isPointInRoom(r, x+1, y) ||
                              !roomShapeService.isPointInRoom(r, x, y-1) ||
                              !roomShapeService.isPointInRoom(r, x, y+1);
              grid[y][x] = isBorder ? "#" : ".";
            }
          }
        }
      }
    }
  }
  for (const c of d.corridors) {
    for (const p of c.path) {
      if (grid[p.y]?.[p.x] === " ") grid[p.y][p.x] = "+";
    }
    if (c.path.length > 0) {
      const start = c.path[0];
      const end = c.path[c.path.length - 1];
      grid[start.y][start.x] = "D";
      grid[end.y][end.x] = "D";
    }
  }
  return grid.map((row) => row.join("")).join("\n");
}

/**
 * Render a very simple SVG representation of the dungeon. Rooms are drawn as
 * stroked rectangles and corridor tiles are filled squares. Doorways are shown
 * as short lines on corridor-room boundaries. The output is a standalone SVG
 * string sized to the dungeon's extents.
 */
function doorEdge(room: Room, tile: { x: number; y: number }) {
  // Handle case where corridor point is outside room (original logic)
  if (tile.x < room.x)
    return { x1: room.x, y1: tile.y, x2: room.x, y2: tile.y + 1 };
  if (tile.x >= room.x + room.w)
    return { x1: room.x + room.w, y1: tile.y, x2: room.x + room.w, y2: tile.y + 1 };
  if (tile.y < room.y)
    return { x1: tile.x, y1: room.y, x2: tile.x + 1, y2: room.y };
  if (tile.y >= room.y + room.h)
    return {
      x1: tile.x,
      y1: room.y + room.h,
      x2: tile.x + 1,
      y2: room.y + room.h,
    };
  
  // Handle case where corridor point is inside room
  // Find the closest edge of the room to place the door
  const distToLeft = tile.x - room.x;
  const distToRight = (room.x + room.w - 1) - tile.x;
  const distToTop = tile.y - room.y;
  const distToBottom = (room.y + room.h - 1) - tile.y;
  
  const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
  
  if (minDist === distToLeft && distToLeft >= 0) {
    // Door on left edge
    return { x1: room.x, y1: tile.y, x2: room.x, y2: tile.y + 1 };
  } else if (minDist === distToRight && distToRight >= 0) {
    // Door on right edge
    return { x1: room.x + room.w, y1: tile.y, x2: room.x + room.w, y2: tile.y + 1 };
  } else if (minDist === distToTop && distToTop >= 0) {
    // Door on top edge
    return { x1: tile.x, y1: room.y, x2: tile.x + 1, y2: room.y };
  } else if (minDist === distToBottom && distToBottom >= 0) {
    // Door on bottom edge
    return { x1: tile.x, y1: room.y + room.h, x2: tile.x + 1, y2: room.y + room.h };
  }
  
  return null;
}

export function renderSvg(
  d: Dungeon,
  theme: RenderTheme = lightTheme,
): string {
  const cell = 20; // pixel size of a single grid square
  const points: { x: number; y: number }[] = [];
  for (const r of d.rooms) {
    if (r.shape === 'rectangular' || !r.shapePoints) {
      points.push({ x: r.x + r.w, y: r.y + r.h });
    } else {
      // For shaped rooms, use the room bounds
      const bounds = roomShapeService.getRoomBounds(r);
      points.push({ x: Math.ceil(bounds.maxX), y: Math.ceil(bounds.maxY) });
    }
  }
  for (const c of d.corridors) {
    for (const p of c.path) points.push(p);
  }
  const maxX = Math.max(0, ...points.map((p) => p.x)) + 1;
  const maxY = Math.max(0, ...points.map((p) => p.y)) + 1;
  const width = maxX * cell;
  const height = maxY * cell;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${theme.background}"/>`,
  ];

  for (const c of d.corridors) {
    for (const p of c.path) {
      parts.push(
        `<rect x="${p.x * cell}" y="${p.y * cell}" width="${cell}" height="${cell}" fill="${theme.corridorFill}" stroke="none"/>`,
      );
    }
    if (c.path.length > 0) {
      const start = c.path[0];
      const end = c.path[c.path.length - 1];
      const fromRoom = d.rooms.find((r) => r.id === c.from);
      const toRoom = d.rooms.find((r) => r.id === c.to);
      if (fromRoom) {
        const edge = doorEdge(fromRoom, start);
        if (edge)
          parts.push(
            `<line x1="${edge.x1 * cell}" y1="${edge.y1 * cell}" x2="${edge.x2 * cell}" y2="${edge.y2 * cell}" stroke="${theme.roomStroke}" stroke-width="${cell * 0.2}"/>`,
          );
      }
      if (toRoom) {
        const edge = doorEdge(toRoom, end);
        if (edge)
          parts.push(
            `<line x1="${edge.x1 * cell}" y1="${edge.y1 * cell}" x2="${edge.x2 * cell}" y2="${edge.y2 * cell}" stroke="${theme.roomStroke}" stroke-width="${cell * 0.2}"/>`,
          );
      }
    }
  }

  d.rooms.forEach((r, i) => {
    if (r.shape === 'rectangular' || !r.shapePoints) {
      // Render rectangular rooms as before
      parts.push(
        `<rect x="${r.x * cell}" y="${r.y * cell}" width="${r.w * cell}" height="${r.h * cell}" fill="${theme.roomFill}" stroke="${theme.roomStroke}"/>`,
      );
      const cx = (r.x + r.w / 2) * cell;
      const cy = (r.y + r.h / 2) * cell;
      parts.push(
        `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${cell * 0.6}" fill="${theme.textFill}">${i + 1}</text>`,
      );
    } else {
      // Render shaped rooms as polygons
      const points = r.shapePoints!.map(p => `${p.x * cell},${p.y * cell}`).join(' ');
      parts.push(
        `<polygon points="${points}" fill="${theme.roomFill}" stroke="${theme.roomStroke}"/>`,
      );
      // Place text at the center of the room
      const cx = r.x * cell;
      const cy = r.y * cell;
      parts.push(
        `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${cell * 0.6}" fill="${theme.textFill}">${i + 1}</text>`,
      );
    }
  });

  parts.push("</svg>");
  return parts.join("");
}

export default renderAscii;
