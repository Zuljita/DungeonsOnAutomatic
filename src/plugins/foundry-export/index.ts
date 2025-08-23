import type { 
  ExportPlugin, 
  ExportOptions, 
  ExportResult, 
  PluginMetadata 
} from '../../core/plugin-types';
import type { Dungeon, Room } from '../../core/types';
import { roomShapeService } from '../../services/room-shapes';
import { distance, segmentLength, getEdgeVector, isPointOnLineSegmentLegacy } from '../../utils/geometry';

// === Foundry-specific types ===

interface FoundryWall {
  c: [number, number, number, number];
}

interface FoundryDoor {
  c: [number, number, number, number];
}

interface FoundryScene {
  name: string;
  walls: FoundryWall[];
  doors: FoundryDoor[];
  width: number;
  height: number;
  grid: number;
}

// === Core Foundry export logic ===

/**
 * Convert a dungeon into a FoundryVTT Scene JSON format.
 * Extracted from src/services/foundry.ts with identical logic.
 */
function convertDungeonToFoundryScene(d: Dungeon, grid = 100): FoundryScene {
  const cells: { x: number; y: number }[] = [];
  
  // Process rooms - handle both rectangular and shaped rooms
  for (const r of d.rooms) {
    if (r.shape === 'rectangular' || !r.shapePoints) {
      // Use original rectangular logic for rectangular rooms
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          cells.push({ x, y });
        }
      }
    } else {
      // Use shape-aware logic for non-rectangular rooms
      const bounds = roomShapeService.getRoomBounds(r);
      for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y++) {
        for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x++) {
          if (roomShapeService.isPointInRoom(r, x, y)) {
            cells.push({ x, y });
          }
        }
      }
    }
  }
  
  // Process corridors
  for (const c of d.corridors) {
    for (const p of c.path) cells.push(p);
  }

  const maxX = Math.max(0, ...cells.map((p) => p.x)) + 1;
  const maxY = Math.max(0, ...cells.map((p) => p.y)) + 1;

  // Generate wall edges using edge detection algorithm
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

  // Generate door segments with complex geometry handling
  const doorSegments: [number, number, number, number][] = [];
  for (const c of d.corridors) {
    if (c.path.length > 0) {
      const fromRoom = d.rooms.find((r) => r.id === c.from);
      const toRoom = d.rooms.find((r) => r.id === c.to);
      
      if (fromRoom) {
        const doorPosition = c.doorStart || c.path[0];
        const seg = calculateDoorEdge(fromRoom, doorPosition);
        if (seg) doorSegments.push([...seg]);
      }
      
      if (toRoom) {
        const doorPosition = c.doorEnd || c.path[c.path.length - 1];
        const seg = calculateDoorEdge(toRoom, doorPosition);
        if (seg) doorSegments.push([...seg]);
      }
    }
  }

  // Convert to Foundry format with grid scaling
  const doors: FoundryDoor[] = doorSegments.map(([x1, y1, x2, y2]) => ({
    c: [x1 * grid, y1 * grid, x2 * grid, y2 * grid] as [number, number, number, number],
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

/**
 * Calculate door edge coordinates for a room and door position.
 * Complex geometry handling for both rectangular and shaped rooms.
 */
function calculateDoorEdge(room: Room, doorPosition: { x: number; y: number }): readonly [number, number, number, number] | null {
  // For non-rectangular rooms, use shape-aware door rendering
  if (room.shape !== 'rectangular' && room.shapePoints) {
    return renderShapedRoomDoor(room, doorPosition);
  }
  
  // Handle rectangular rooms with the original logic
  // Handle case where door position is outside room
  if (doorPosition.x < room.x) return [room.x, doorPosition.y, room.x, doorPosition.y + 1] as const;
  if (doorPosition.x >= room.x + room.w)
    return [room.x + room.w, doorPosition.y, room.x + room.w, doorPosition.y + 1] as const;
  if (doorPosition.y < room.y) return [doorPosition.x, room.y, doorPosition.x + 1, room.y] as const;
  if (doorPosition.y >= room.y + room.h)
    return [doorPosition.x, room.y + room.h, doorPosition.x + 1, room.y + room.h] as const;
  
  // Handle case where door position is inside room
  // Find the closest edge of the room to place the door
  const distToLeft = doorPosition.x - room.x;
  const distToRight = (room.x + room.w - 1) - doorPosition.x;
  const distToTop = doorPosition.y - room.y;
  const distToBottom = (room.y + room.h - 1) - doorPosition.y;
  
  const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
  
  if (minDist === distToLeft && distToLeft >= 0) {
    // Door on left edge
    return [room.x, doorPosition.y, room.x, doorPosition.y + 1] as const;
  } else if (minDist === distToRight && distToRight >= 0) {
    // Door on right edge
    return [room.x + room.w, doorPosition.y, room.x + room.w, doorPosition.y + 1] as const;
  } else if (minDist === distToTop && distToTop >= 0) {
    // Door on top edge
    return [doorPosition.x, room.y, doorPosition.x + 1, room.y] as const;
  } else if (minDist === distToBottom && distToBottom >= 0) {
    // Door on bottom edge
    return [doorPosition.x, room.y + room.h, doorPosition.x + 1, room.y + room.h] as const;
  }
  
  return null;
}

/**
 * Render door for shaped (non-rectangular) rooms using edge detection.
 */
function renderShapedRoomDoor(room: Room, doorPosition: { x: number; y: number }): readonly [number, number, number, number] {
  // Find the edge segment containing the door position
  const shapePoints = room.shapePoints!;
  
  for (let i = 0; i < shapePoints.length; i++) {
    const p1 = shapePoints[i];
    const p2 = shapePoints[(i + 1) % shapePoints.length];
    
    // Check if the door position lies on or near this edge segment
    if (isPointOnLineSegmentLegacy(doorPosition, p1, p2, 0.5)) {
      // For Foundry, create a door segment along the edge
      const edgeLength = segmentLength(p1, p2);
      if (edgeLength > 0) {
        // Create a door segment of standard length (1 unit) centered on the door position
        const edgeVector = getEdgeVector(p1, p2);
        const edgeVectorX = edgeVector.x;
        const edgeVectorY = edgeVector.y;
        const doorLength = 1;
        const halfLength = doorLength / 2;
        
        return [
          doorPosition.x - edgeVectorX * halfLength,
          doorPosition.y - edgeVectorY * halfLength,
          doorPosition.x + edgeVectorX * halfLength,
          doorPosition.y + edgeVectorY * halfLength,
        ] as const;
      }
    }
  }
  
  // Fallback: create a simple horizontal door segment at the door position
  return [doorPosition.x - 0.5, doorPosition.y, doorPosition.x + 0.5, doorPosition.y] as const;
}

// === Plugin Implementation ===

const metadata: PluginMetadata = {
  id: 'foundry-export',
  version: '1.0.0',
  description: 'Core FoundryVTT export plugin for Dungeons On Automatic',
  author: 'Dungeons On Automatic'
};

const foundryExportPlugin: ExportPlugin = {
  metadata,
  supportedFormats: ['foundry'],
  
  export(dungeon: Dungeon, format: string, options?: ExportOptions): ExportResult {
    if (format !== 'foundry') {
      throw new Error(`Unsupported export format: ${format}. This plugin supports: foundry`);
    }
    
    // Extract grid size from options, default to 100
    const grid = (options?.grid as number) || 100;
    
    // Convert dungeon to Foundry scene format
    const foundryScene = convertDungeonToFoundryScene(dungeon, grid);
    
    return {
      format: 'foundry',
      data: JSON.stringify(foundryScene, null, 2),
      contentType: 'application/json',
      filename: options?.filename || 'dungeon.json',
      metadata: {
        grid,
        rooms: dungeon.rooms.length,
        corridors: dungeon.corridors.length,
        doors: foundryScene.doors.length,
        walls: foundryScene.walls.length
      }
    };
  }
};

export default foundryExportPlugin;