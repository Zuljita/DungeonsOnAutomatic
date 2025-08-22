import { Dungeon, Room } from "../core/types";
import { roomShapeService } from "./room-shapes";
import { calculateGridBounds, createGrid, createGridFromPoints, isInBounds, Point } from '../utils/grid-utils';
import { isRectangularRoom, isPointOnRoomBorder } from '../utils/room-utils';

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
  const { grid, bounds, transform } = createGridFromPoints(points, " ");

  for (const r of d.rooms) {
    if (isRectangularRoom(r)) {
      // Use original rectangular rendering for rectangular rooms
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          const gridCoord = transform(x, y);
          if (isInBounds(gridCoord.x, gridCoord.y, bounds.width, bounds.height)) {
            const border = x === r.x || x === r.x + r.w - 1 || y === r.y || y === r.y + r.h - 1;
            grid[gridCoord.y][gridCoord.x] = border ? "#" : ".";
          }
        }
      }
    } else {
      // Use shape-aware rendering for non-rectangular rooms
      const roomBounds = roomShapeService.getRoomBounds(r);
      for (let y = Math.floor(roomBounds.minY); y <= Math.ceil(roomBounds.maxY); y++) {
        for (let x = Math.floor(roomBounds.minX); x <= Math.ceil(roomBounds.maxX); x++) {
          const gridCoord = transform(x, y);
          if (isInBounds(gridCoord.x, gridCoord.y, bounds.width, bounds.height)) {
            if (roomShapeService.isPointInRoom(r, x, y)) {
              const isBorder = isPointOnRoomBorder(r, x, y);
              grid[gridCoord.y][gridCoord.x] = isBorder ? "#" : ".";
            }
          }
        }
      }
    }
  }
  for (const c of d.corridors) {
    for (const p of c.path) {
      const gridCoord = transform(p.x, p.y);
      if (grid[gridCoord.y]?.[gridCoord.x] === " ") {
        grid[gridCoord.y][gridCoord.x] = "+";
      }
    }
    if (c.path.length > 0) {
      const start = transform(c.path[0].x, c.path[0].y);
      const end = transform(c.path[c.path.length - 1].x, c.path[c.path.length - 1].y);
      grid[start.y][start.x] = "D";
      grid[end.y][end.x] = "D";
    }
  }

  // Render keys if they exist
  if (d.keyItems) {
    for (const key of d.keyItems) {
      const room = d.rooms.find(r => r.id === key.locationId);
      if (room) {
        // Calculate key position exactly like debug renderer
        const keyX = Math.floor(room.x + room.w / 2);              // Horizontal center
        const keyY = Math.floor(room.y + room.h / 2 - 0.4);        // Slightly above center
        
        // Ensure key position is within grid bounds
        const keyGridCoord = transform(keyX, keyY);
        if (isInBounds(keyGridCoord.x, keyGridCoord.y, bounds.width, bounds.height)) {
          grid[keyGridCoord.y][keyGridCoord.x] = "K";  // Use 'K' for key
        }
      }
    }
  }

  return grid.map((row) => row.join("")).join("\n");
}

export default renderAscii;