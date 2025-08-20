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

export const sepiaTheme: RenderTheme = {
  background: "#fdf5e6",
  corridorFill: "#e2d3b5",
  roomFill: "#fffaf0",
  roomStroke: "#5b4636",
  textFill: "#5b4636",
};

export interface RenderOptions {
  /** Style variant for SVG rendering */
  style?: "classic" | "hand-drawn";
  /** Show subtle grid background for technical pen style */
  showGrid?: boolean;
  /** Line wobble intensity for hand-drawn style (0-2) */
  wobbleIntensity?: number;
  /** Wall thickness multiplier for hand-drawn style */
  wallThickness?: number;
}

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

/**
 * Create a wobbly line path for technical pen hand-drawn style
 * Uses multiple points with subtle perturbations for organic feel
 */
function createWobblyPath(x1: number, y1: number, x2: number, y2: number, wobbleIntensity: number, rng: () => number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // For very short lines, don't add wobble
  if (length < 10) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  
  const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
  
  // Add intermediate points for wobble effect
  const numSegments = Math.max(3, Math.floor(length / 8));
  for (let i = 1; i < numSegments; i++) {
    const t = i / numSegments;
    const baseX = x1 + dx * t;
    const baseY = y1 + dy * t;
    
    // Perpendicular wobble
    const perpX = -dy / length;
    const perpY = dx / length;
    const wobble = (rng() - 0.5) * wobbleIntensity * 2;
    
    points.push({
      x: baseX + perpX * wobble,
      y: baseY + perpY * wobble
    });
  }
  
  points.push({ x: x2, y: y2 });
  
  // Create smooth path using quadratic bezier curves
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const controlX = curr.x;
    const controlY = curr.y;
    const endX = (curr.x + next.x) / 2;
    const endY = (curr.y + next.y) / 2;
    path += ` Q ${controlX} ${controlY} ${endX} ${endY}`;
  }
  
  // Final segment to end point
  const lastPoint = points[points.length - 1];
  path += ` L ${lastPoint.x} ${lastPoint.y}`;
  
  return path;
}

/**
 * Generate crosshatching pattern for filled areas
 */
function generateCrosshatch(x: number, y: number, width: number, height: number, density: number, rng: () => number): string[] {
  const lines: string[] = [];
  const spacing = 8; // Increase spacing to reduce line count
  
  // First set of diagonal lines (top-left to bottom-right)
  for (let i = -width; i < width + height; i += spacing) {
    const startX = x + i;
    const startY = y;
    const endX = x + i + height;
    const endY = y + height;
    
    // Clip to rectangle bounds
    const clippedStart = clipLineToRect(startX, startY, endX, endY, x, y, width, height);
    if (clippedStart) {
      // Use simple lines instead of wobbly paths for crosshatching
      lines.push(`<line x1="${clippedStart.x1}" y1="${clippedStart.y1}" x2="${clippedStart.x2}" y2="${clippedStart.y2}" stroke="#000000" stroke-width="0.5" opacity="0.7"/>`);
    }
  }
  
  // Second set of diagonal lines (top-right to bottom-left)
  for (let i = -height; i < width + height; i += spacing) {
    const startX = x + width;
    const startY = y + i;
    const endX = x;
    const endY = y + i + width;
    
    // Clip to rectangle bounds
    const clippedStart = clipLineToRect(startX, startY, endX, endY, x, y, width, height);
    if (clippedStart) {
      // Use simple lines instead of wobbly paths for crosshatching
      lines.push(`<line x1="${clippedStart.x1}" y1="${clippedStart.y1}" x2="${clippedStart.x2}" y2="${clippedStart.y2}" stroke="#000000" stroke-width="0.5" opacity="0.7"/>`);
    }
  }
  
  return lines;
}

/**
 * Clip a line to rectangle bounds
 */
function clipLineToRect(x1: number, y1: number, x2: number, y2: number, rectX: number, rectY: number, rectW: number, rectH: number): { x1: number; y1: number; x2: number; y2: number } | null {
  const left = rectX;
  const right = rectX + rectW;
  const top = rectY;
  const bottom = rectY + rectH;
  
  // Simple clipping - find intersections with rectangle edges
  let clipX1 = x1, clipY1 = y1, clipX2 = x2, clipY2 = y2;
  
  // Clip start point
  if (x1 < left) {
    clipY1 = y1 + (y2 - y1) * (left - x1) / (x2 - x1);
    clipX1 = left;
  } else if (x1 > right) {
    clipY1 = y1 + (y2 - y1) * (right - x1) / (x2 - x1);
    clipX1 = right;
  }
  
  if (y1 < top) {
    clipX1 = x1 + (x2 - x1) * (top - y1) / (y2 - y1);
    clipY1 = top;
  } else if (y1 > bottom) {
    clipX1 = x1 + (x2 - x1) * (bottom - y1) / (y2 - y1);
    clipY1 = bottom;
  }
  
  // Clip end point
  if (x2 < left) {
    clipY2 = y1 + (y2 - y1) * (left - x1) / (x2 - x1);
    clipX2 = left;
  } else if (x2 > right) {
    clipY2 = y1 + (y2 - y1) * (right - x1) / (x2 - x1);
    clipX2 = right;
  }
  
  if (y2 < top) {
    clipX2 = x1 + (x2 - x1) * (top - y1) / (y2 - y1);
    clipY2 = top;
  } else if (y2 > bottom) {
    clipX2 = x1 + (x2 - x1) * (bottom - y1) / (y2 - y1);
    clipY2 = bottom;
  }
  
  // Check if line is completely outside
  if (clipX1 < left && clipX2 < left) return null;
  if (clipX1 > right && clipX2 > right) return null;
  if (clipY1 < top && clipY2 < top) return null;
  if (clipY1 > bottom && clipY2 > bottom) return null;
  
  return { x1: clipX1, y1: clipY1, x2: clipX2, y2: clipY2 };
}

export function renderSvg(
  d: Dungeon,
  theme: RenderTheme = lightTheme,
  opts: RenderOptions = {},
): string {
  const cell = 20; // pixel size of a single grid square
  const style = opts.style ?? "classic";
  const showGrid = opts.showGrid ?? false;
  const wobbleIntensity = opts.wobbleIntensity ?? 1;
  const wallThickness = opts.wallThickness ?? 1;
  const rng = d.rng ?? Math.random;
  
  // Calculate map bounds
  const points: { x: number; y: number }[] = [];
  for (const r of d.rooms) {
    if (r.shape === 'rectangular' || !r.shapePoints) {
      points.push({ x: r.x + r.w, y: r.y + r.h });
    } else {
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
  ];

  if (style === "hand-drawn") {
    // Technical pen style: high contrast black and white
    parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`);
    
    // Optional subtle grid background
    if (showGrid) {
      const gridSpacing = cell;
      parts.push(`<defs><pattern id="grid" width="${gridSpacing}" height="${gridSpacing}" patternUnits="userSpaceOnUse"><path d="M ${gridSpacing} 0 L 0 0 0 ${gridSpacing}" fill="none" stroke="#e8e8e8" stroke-width="0.3"/></pattern></defs>`);
      parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#grid)"/>`);
    }
    
    // Create efficient crosshatching pattern using SVG patterns
    // This replaces the performance-heavy line-by-line generation
    const patternSize = 8; // Size of the crosshatch pattern
    const lineWidth = 0.5;
    const opacity = 0.7;
    
    // Create a mask for walkable areas using proper shapes
    parts.push(`<defs>`);
    
    // Define crosshatch pattern
    parts.push(`<pattern id="crosshatch" patternUnits="userSpaceOnUse" width="${patternSize}" height="${patternSize}">`);
    parts.push(`<line x1="0" y1="0" x2="${patternSize}" y2="${patternSize}" stroke="#000000" stroke-width="${lineWidth}" opacity="${opacity}"/>`);
    parts.push(`<line x1="0" y1="${patternSize}" x2="${patternSize}" y2="0" stroke="#000000" stroke-width="${lineWidth}" opacity="${opacity}"/>`);
    parts.push(`</pattern>`);
    
    // Create mask for walkable areas
    parts.push(`<mask id="walkableMask">`);
    parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="white"/>`);
    
    // Mask out corridor tiles (make them black in the mask so crosshatching won't show)
    for (const c of d.corridors) {
      for (const p of c.path) {
        parts.push(`<rect x="${p.x * cell}" y="${p.y * cell}" width="${cell}" height="${cell}" fill="black"/>`);
      }
    }
    
    // Mask out room areas using proper shapes
    for (const r of d.rooms) {
      if (r.shape === 'rectangular' || !r.shapePoints) {
        // Rectangular rooms - use rectangle
        parts.push(`<rect x="${r.x * cell}" y="${r.y * cell}" width="${r.w * cell}" height="${r.h * cell}" fill="black"/>`);
      } else {
        // Shaped rooms - use actual polygon shape
        const points = r.shapePoints!.map((p) => `${p.x * cell},${p.y * cell}`).join(" ");
        parts.push(`<polygon points="${points}" fill="black"/>`);
      }
    }
    parts.push(`</mask>`);
    parts.push(`</defs>`);
    
    // Apply crosshatching pattern with mask - single rectangle instead of thousands of lines
    parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#crosshatch)" mask="url(#walkableMask)"/>`);
    
    // Draw room outlines with thick, wobbly walls
    d.rooms.forEach((r, i) => {
      const thickness = 3 * wallThickness;
      
      if (r.shape === "rectangular" || !r.shapePoints) {
        // Draw thick walls for rectangular rooms
        const x = r.x * cell;
        const y = r.y * cell;
        const w = r.w * cell;
        const h = r.h * cell;
        
        // Top wall
        const topPath = createWobblyPath(x, y, x + w, y, wobbleIntensity, rng);
        parts.push(`<path d="${topPath}" stroke="#000000" stroke-width="${thickness}" fill="none" stroke-linecap="round"/>`);
        
        // Right wall
        const rightPath = createWobblyPath(x + w, y, x + w, y + h, wobbleIntensity, rng);
        parts.push(`<path d="${rightPath}" stroke="#000000" stroke-width="${thickness}" fill="none" stroke-linecap="round"/>`);
        
        // Bottom wall
        const bottomPath = createWobblyPath(x + w, y + h, x, y + h, wobbleIntensity, rng);
        parts.push(`<path d="${bottomPath}" stroke="#000000" stroke-width="${thickness}" fill="none" stroke-linecap="round"/>`);
        
        // Left wall
        const leftPath = createWobblyPath(x, y + h, x, y, wobbleIntensity, rng);
        parts.push(`<path d="${leftPath}" stroke="#000000" stroke-width="${thickness}" fill="none" stroke-linecap="round"/>`);
        
      } else {
        // Draw thick walls for shaped rooms
        const points = r.shapePoints!;
        for (let j = 0; j < points.length; j++) {
          const curr = points[j];
          const next = points[(j + 1) % points.length];
          const wallPath = createWobblyPath(curr.x * cell, curr.y * cell, next.x * cell, next.y * cell, wobbleIntensity, rng);
          parts.push(`<path d="${wallPath}" stroke="#000000" stroke-width="${thickness}" fill="none" stroke-linecap="round"/>`);
        }
      }
      
      // Room numbers with hand-drawn style
      const cx = (r.x + r.w / 2) * cell;
      const cy = (r.y + r.h / 2) * cell;
      const wobbleX = (rng() - 0.5) * wobbleIntensity;
      const wobbleY = (rng() - 0.5) * wobbleIntensity;
      const rotation = (rng() - 0.5) * 5 * wobbleIntensity;
      
      parts.push(
        `<text x="${cx + wobbleX}" y="${cy + wobbleY}" text-anchor="middle" dominant-baseline="middle" font-size="${cell * 0.7}" fill="#000000" font-family="serif" font-weight="bold" transform="rotate(${rotation},${cx + wobbleX},${cy + wobbleY})">${i + 1}</text>`,
      );
    });
    
    // Draw corridor outlines
    for (const c of d.corridors) {
      for (const p of c.path) {
        const x = p.x * cell;
        const y = p.y * cell;
        const thickness = 2 * wallThickness;
        
        // Draw outline around corridor tile
        const outlinePath = createWobblyPath(x, y, x + cell, y, wobbleIntensity, rng) + " " +
                          createWobblyPath(x + cell, y, x + cell, y + cell, wobbleIntensity, rng) + " " +
                          createWobblyPath(x + cell, y + cell, x, y + cell, wobbleIntensity, rng) + " " +
                          createWobblyPath(x, y + cell, x, y, wobbleIntensity, rng);
        
        // Only draw outline if this corridor tile is adjacent to solid area
        // (We'll simplify and draw thin outlines for all corridor tiles)
        parts.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="none" stroke="#000000" stroke-width="1" opacity="0.3"/>`);
      }
    }
    
    // Draw doors with enhanced visibility for technical pen style
    for (const c of d.corridors) {
      if (c.path.length > 0) {
        const start = c.path[0];
        const end = c.path[c.path.length - 1];
        const fromRoom = d.rooms.find((r) => r.id === c.from);
        const toRoom = d.rooms.find((r) => r.id === c.to);
        
        if (fromRoom) {
          const doorPosition = c.doorStart || start;
          const edge = doorEdge(fromRoom, doorPosition);
          if (edge) {
            // Draw door as a white "gap" with thick black borders
            const doorThickness = 6 * wallThickness;
            const borderThickness = 2 * wallThickness;
            
            // First draw a thick white line to create the "opening"
            const whiteDoorPath = createWobblyPath(edge.x1 * cell, edge.y1 * cell, edge.x2 * cell, edge.y2 * cell, wobbleIntensity * 0.3, rng);
            parts.push(`<path d="${whiteDoorPath}" stroke="#ffffff" stroke-width="${doorThickness}" fill="none" stroke-linecap="round"/>`);
            
            // Then draw black border lines on each side of the door
            const doorLength = Math.sqrt((edge.x2 - edge.x1) ** 2 + (edge.y2 - edge.y1) ** 2);
            if (doorLength > 0) {
              const dx = (edge.x2 - edge.x1) / doorLength;
              const dy = (edge.y2 - edge.y1) / doorLength;
              const perpX = -dy * doorThickness * 0.4;
              const perpY = dx * doorThickness * 0.4;
              
              // Left border
              const leftBorderPath = createWobblyPath(
                edge.x1 * cell + perpX, edge.y1 * cell + perpY,
                edge.x2 * cell + perpX, edge.y2 * cell + perpY,
                wobbleIntensity * 0.3, rng
              );
              parts.push(`<path d="${leftBorderPath}" stroke="#000000" stroke-width="${borderThickness}" fill="none" stroke-linecap="round"/>`);
              
              // Right border
              const rightBorderPath = createWobblyPath(
                edge.x1 * cell - perpX, edge.y1 * cell - perpY,
                edge.x2 * cell - perpX, edge.y2 * cell - perpY,
                wobbleIntensity * 0.3, rng
              );
              parts.push(`<path d="${rightBorderPath}" stroke="#000000" stroke-width="${borderThickness}" fill="none" stroke-linecap="round"/>`);
            }
          }
        }
        
        if (toRoom) {
          const doorPosition = c.doorEnd || end;
          const edge = doorEdge(toRoom, doorPosition);
          if (edge) {
            // Draw door as a white "gap" with thick black borders
            const doorThickness = 6 * wallThickness;
            const borderThickness = 2 * wallThickness;
            
            // First draw a thick white line to create the "opening"
            const whiteDoorPath = createWobblyPath(edge.x1 * cell, edge.y1 * cell, edge.x2 * cell, edge.y2 * cell, wobbleIntensity * 0.3, rng);
            parts.push(`<path d="${whiteDoorPath}" stroke="#ffffff" stroke-width="${doorThickness}" fill="none" stroke-linecap="round"/>`);
            
            // Then draw black border lines on each side of the door
            const doorLength = Math.sqrt((edge.x2 - edge.x1) ** 2 + (edge.y2 - edge.y1) ** 2);
            if (doorLength > 0) {
              const dx = (edge.x2 - edge.x1) / doorLength;
              const dy = (edge.y2 - edge.y1) / doorLength;
              const perpX = -dy * doorThickness * 0.4;
              const perpY = dx * doorThickness * 0.4;
              
              // Left border
              const leftBorderPath = createWobblyPath(
                edge.x1 * cell + perpX, edge.y1 * cell + perpY,
                edge.x2 * cell + perpX, edge.y2 * cell + perpY,
                wobbleIntensity * 0.3, rng
              );
              parts.push(`<path d="${leftBorderPath}" stroke="#000000" stroke-width="${borderThickness}" fill="none" stroke-linecap="round"/>`);
              
              // Right border
              const rightBorderPath = createWobblyPath(
                edge.x1 * cell - perpX, edge.y1 * cell - perpY,
                edge.x2 * cell - perpX, edge.y2 * cell - perpY,
                wobbleIntensity * 0.3, rng
              );
              parts.push(`<path d="${rightBorderPath}" stroke="#000000" stroke-width="${borderThickness}" fill="none" stroke-linecap="round"/>`);
            }
          }
        }
      }
    }
    
  } else {
    // Classic style rendering (unchanged)
    parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${theme.background}"/>`);

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
          const doorPosition = c.doorStart || start;
          const edge = doorEdge(fromRoom, doorPosition);
          if (edge)
            parts.push(
              `<line x1="${edge.x1 * cell}" y1="${edge.y1 * cell}" x2="${edge.x2 * cell}" y2="${edge.y2 * cell}" stroke="${theme.roomStroke}" stroke-width="${cell * 0.2}"/>`,
            );
        }
        if (toRoom) {
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
      if (r.shape === "rectangular" || !r.shapePoints) {
        parts.push(
          `<rect x="${r.x * cell}" y="${r.y * cell}" width="${r.w * cell}" height="${r.h * cell}" fill="${theme.roomFill}" stroke="${theme.roomStroke}"/>`,
        );
        const cx = (r.x + r.w / 2) * cell;
        const cy = (r.y + r.h / 2) * cell;
        parts.push(
          `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${cell * 0.6}" fill="${theme.textFill}">${i + 1}</text>`,
        );
      } else {
        const points = r.shapePoints!.map((p) => `${p.x * cell},${p.y * cell}`).join(" ");
        parts.push(
          `<polygon points="${points}" fill="${theme.roomFill}" stroke="${theme.roomStroke}"/>`,
        );
        const cx = r.x * cell;
        const cy = r.y * cell;
        parts.push(
          `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${cell * 0.6}" fill="${theme.textFill}">${i + 1}</text>`,
        );
      }
    });
  }

  parts.push("</svg>");
  return parts.join("");
}

export default renderAscii;
