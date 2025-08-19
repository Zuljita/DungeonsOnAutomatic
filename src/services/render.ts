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
function doorEdge(room: Room, doorPosition: { x: number; y: number }) {
  // For non-rectangular rooms, use shape-aware door rendering
  if (room.shape !== 'rectangular' && room.shapePoints) {
    return renderShapedRoomDoor(room, doorPosition);
  }
  
  // For rectangular rooms, find the closest wall edge and snap the door exactly to that edge
  const roomLeft = room.x;
  const roomRight = room.x + room.w;
  const roomTop = room.y;
  const roomBottom = room.y + room.h;
  
  const doorWidth = 0.8; // Width of door opening
  const halfDoorWidth = doorWidth / 2;
  
  // Calculate distances to each edge
  const distToLeft = Math.abs(doorPosition.x - roomLeft);
  const distToRight = Math.abs(doorPosition.x - roomRight);
  const distToTop = Math.abs(doorPosition.y - roomTop);
  const distToBottom = Math.abs(doorPosition.y - roomBottom);
  
  const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
  
  // Snap door exactly to the closest wall edge
  if (minDist === distToLeft) {
    // Door on left edge - ensure door stays within room height bounds
    const y1 = Math.max(roomTop, doorPosition.y - halfDoorWidth);
    const y2 = Math.min(roomBottom, doorPosition.y + halfDoorWidth);
    // If door would be too small, center it within available space
    if (y2 - y1 < doorWidth) {
      const centerY = (roomTop + roomBottom) / 2;
      return { 
        x1: roomLeft, 
        y1: centerY - halfDoorWidth, 
        x2: roomLeft, 
        y2: centerY + halfDoorWidth 
      };
    }
    return { 
      x1: roomLeft, 
      y1: y1, 
      x2: roomLeft, 
      y2: y2 
    };
  } else if (minDist === distToRight) {
    // Door on right edge - ensure door stays within room height bounds
    const y1 = Math.max(roomTop, doorPosition.y - halfDoorWidth);
    const y2 = Math.min(roomBottom, doorPosition.y + halfDoorWidth);
    if (y2 - y1 < doorWidth) {
      const centerY = (roomTop + roomBottom) / 2;
      return { 
        x1: roomRight, 
        y1: centerY - halfDoorWidth, 
        x2: roomRight, 
        y2: centerY + halfDoorWidth 
      };
    }
    return { 
      x1: roomRight, 
      y1: y1, 
      x2: roomRight, 
      y2: y2 
    };
  } else if (minDist === distToTop) {
    // Door on top edge - ensure door stays within room width bounds
    const x1 = Math.max(roomLeft, doorPosition.x - halfDoorWidth);
    const x2 = Math.min(roomRight, doorPosition.x + halfDoorWidth);
    if (x2 - x1 < doorWidth) {
      const centerX = (roomLeft + roomRight) / 2;
      return { 
        x1: centerX - halfDoorWidth, 
        y1: roomTop, 
        x2: centerX + halfDoorWidth, 
        y2: roomTop 
      };
    }
    return { 
      x1: x1, 
      y1: roomTop, 
      x2: x2, 
      y2: roomTop 
    };
  } else {
    // Door on bottom edge - ensure door stays within room width bounds
    const x1 = Math.max(roomLeft, doorPosition.x - halfDoorWidth);
    const x2 = Math.min(roomRight, doorPosition.x + halfDoorWidth);
    if (x2 - x1 < doorWidth) {
      const centerX = (roomLeft + roomRight) / 2;
      return { 
        x1: centerX - halfDoorWidth, 
        y1: roomBottom, 
        x2: centerX + halfDoorWidth, 
        y2: roomBottom 
      };
    }
    return { 
      x1: x1, 
      y1: roomBottom, 
      x2: x2, 
      y2: roomBottom 
    };
  }
}

function renderShapedRoomDoor(room: Room, doorPosition: { x: number; y: number }) {
  // Find the closest edge segment and snap door to it
  const shapePoints = room.shapePoints!;
  
  let closestEdge = null;
  let closestDistance = Infinity;
  let closestPointOnEdge = { x: doorPosition.x, y: doorPosition.y };
  
  for (let i = 0; i < shapePoints.length; i++) {
    const p1 = shapePoints[i];
    const p2 = shapePoints[(i + 1) % shapePoints.length];
    
    // Calculate distance from door position to this line segment
    const distanceToSegment = distanceFromPointToLineSegment(doorPosition, p1, p2);
    
    if (distanceToSegment < closestDistance) {
      closestDistance = distanceToSegment;
      closestEdge = { p1, p2 };
      
      // Find the closest point on this edge segment
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = dx * dx + dy * dy;
      
      if (length > 0) {
        let t = ((doorPosition.x - p1.x) * dx + (doorPosition.y - p1.y) * dy) / length;
        t = Math.max(0, Math.min(1, t));
        closestPointOnEdge = {
          x: p1.x + t * dx,
          y: p1.y + t * dy
        };
      }
    }
  }
  
  if (closestEdge) {
    // Calculate the direction ALONG the wall edge (parallel to the wall)
    const edgeVectorX = closestEdge.p2.x - closestEdge.p1.x;
    const edgeVectorY = closestEdge.p2.y - closestEdge.p1.y;
    const edgeLength = Math.sqrt(edgeVectorX * edgeVectorX + edgeVectorY * edgeVectorY);
    
    if (edgeLength > 0) {
      // Normalize the edge vector (direction along the wall)
      const edgeDirX = edgeVectorX / edgeLength;
      const edgeDirY = edgeVectorY / edgeLength;
      
      // Create a door line ALONG the wall edge, ensuring it stays within the edge segment
      const doorWidth = 0.8;
      const halfWidth = doorWidth / 2;
      
      // Calculate initial door endpoints
      let x1 = closestPointOnEdge.x - edgeDirX * halfWidth;
      let y1 = closestPointOnEdge.y - edgeDirY * halfWidth;
      let x2 = closestPointOnEdge.x + edgeDirX * halfWidth;
      let y2 = closestPointOnEdge.y + edgeDirY * halfWidth;
      
      // Clamp door to stay within the edge segment bounds
      const segmentMinX = Math.min(closestEdge.p1.x, closestEdge.p2.x);
      const segmentMaxX = Math.max(closestEdge.p1.x, closestEdge.p2.x);
      const segmentMinY = Math.min(closestEdge.p1.y, closestEdge.p2.y);
      const segmentMaxY = Math.max(closestEdge.p1.y, closestEdge.p2.y);
      
      x1 = Math.max(segmentMinX, Math.min(segmentMaxX, x1));
      y1 = Math.max(segmentMinY, Math.min(segmentMaxY, y1));
      x2 = Math.max(segmentMinX, Math.min(segmentMaxX, x2));
      y2 = Math.max(segmentMinY, Math.min(segmentMaxY, y2));
      
      return {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
      };
    }
  }
  
  // Fallback: create a simple horizontal door line at the door position
  return {
    x1: doorPosition.x - 0.4,
    y1: doorPosition.y,
    x2: doorPosition.x + 0.4,
    y2: doorPosition.y,
  };
}

function isPointOnLineSegment(point: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, tolerance: number = 0.5): boolean {
  const d1 = distance(point, p1);
  const d2 = distance(point, p2);
  const lineLength = distance(p1, p2);
  
  // Check if the point is approximately on the line segment
  return Math.abs(d1 + d2 - lineLength) < tolerance;
}

function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function distanceFromPointToLineSegment(point: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = dx * dx + dy * dy;
  
  if (length === 0) {
    // p1 and p2 are the same point
    return distance(point, p1);
  }
  
  // Calculate the parameter t for the closest point on the line
  let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / length;
  
  // Clamp t to the line segment [0, 1]
  t = Math.max(0, Math.min(1, t));
  
  // Calculate the closest point on the line segment
  const closestX = p1.x + t * dx;
  const closestY = p1.y + t * dy;
  
  // Return distance from point to closest point on segment
  return distance(point, { x: closestX, y: closestY });
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
        // Use the actual door position if available, otherwise fall back to corridor start
        const doorPosition = c.doorStart || start;
        const edge = doorEdge(fromRoom, doorPosition);
        if (edge)
          parts.push(
            `<line x1="${edge.x1 * cell}" y1="${edge.y1 * cell}" x2="${edge.x2 * cell}" y2="${edge.y2 * cell}" stroke="${theme.roomStroke}" stroke-width="${cell * 0.2}"/>`,
          );
      }
      if (toRoom) {
        // Use the actual door position if available, otherwise fall back to corridor end
        const doorPosition = c.doorEnd || end;
        const edge = doorEdge(toRoom, doorPosition);
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
