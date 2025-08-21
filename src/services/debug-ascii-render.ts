import { Dungeon } from "../core/types";
import { roomShapeService } from "./room-shapes";
import { createGrid } from '../utils/grid-utils';

export interface DebugAsciiOptions {
  /** Scale factor for resolution (default: 10 for 10x more detail) */
  scale?: number;
  /** Show coordinate grid */
  showGrid?: boolean;
  /** Show room centers */
  showRoomCenters?: boolean;
  /** Show door positions */
  showDoors?: boolean;
  /** Show key positions */
  showKeys?: boolean;
  /** Show corridor endpoints and connection points */
  showCorridorConnections?: boolean;
  /** Show door connection analysis */
  showConnectionAnalysis?: boolean;
}

/**
 * High-resolution ASCII renderer based on SVG coordinate system
 * Uses much higher character density to debug positioning issues
 */
export function renderDebugAscii(d: Dungeon, options: DebugAsciiOptions = {}): string {
  const {
    scale = 10,
    showGrid = true,
    showRoomCenters = true,
    showDoors = true,
    showKeys = true,
    showCorridorConnections = true,
    showConnectionAnalysis = true
  } = options;

  // Calculate bounds exactly like SVG renderer
  const points: { x: number; y: number }[] = [];
  
  // Add room bounds
  for (const r of d.rooms) {
    if (r.shape === 'rectangular' || !r.shapePoints) {
      points.push({ x: r.x, y: r.y });
      points.push({ x: r.x + r.w, y: r.y + r.h });
    } else {
      const bounds = roomShapeService.getRoomBounds(r);
      points.push({ x: bounds.minX, y: bounds.minY });
      points.push({ x: bounds.maxX, y: bounds.maxY });
    }
  }
  
  // Add corridor bounds
  for (const c of d.corridors) {
    for (const p of c.path) {
      points.push(p);
    }
  }
  
  // Calculate bounds with padding
  const minX = Math.min(0, ...points.map(p => p.x)) - 2;
  const maxX = Math.max(0, ...points.map(p => p.x)) + 2;
  const minY = Math.min(0, ...points.map(p => p.y)) - 2;
  const maxY = Math.max(0, ...points.map(p => p.y)) + 2;
  
  // Create high-resolution grid
  const width = Math.ceil((maxX - minX) * scale);
  const height = Math.ceil((maxY - minY) * scale);
  const grid = createGrid(width, height, ' ');
  
  // Helper function to convert world coordinates to grid coordinates
  const worldToGrid = (x: number, y: number) => ({
    gx: Math.floor((x - minX) * scale),
    gy: Math.floor((y - minY) * scale)
  });
  
  // Draw coordinate grid if requested
  if (showGrid) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const worldX = minX + x / scale;
        const worldY = minY + y / scale;
        
        // Draw grid dots at integer coordinates
        if (Math.abs(worldX - Math.round(worldX)) < 0.1 / scale && 
            Math.abs(worldY - Math.round(worldY)) < 0.1 / scale) {
          grid[y][x] = '·';
        }
      }
    }
  }
  
  // Draw corridors
  for (const corridor of d.corridors) {
    for (const point of corridor.path) {
      const { gx, gy } = worldToGrid(point.x, point.y);
      if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
        grid[gy][gx] = '+';
      }
    }
  }
  
  // Draw rooms
  for (const room of d.rooms) {
    if (room.shape === 'rectangular' || !room.shapePoints) {
      // Draw rectangular room
      const { gx: gx1, gy: gy1 } = worldToGrid(room.x, room.y);
      const { gx: gx2, gy: gy2 } = worldToGrid(room.x + room.w, room.y + room.h);
      
      // Draw room interior
      for (let gy = gy1; gy <= gy2; gy++) {
        for (let gx = gx1; gx <= gx2; gx++) {
          if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
            // Draw borders
            if (gy === gy1 || gy === gy2 || gx === gx1 || gx === gx2) {
              grid[gy][gx] = '#';
            } else {
              grid[gy][gx] = '.';
            }
          }
        }
      }
    } else {
      // Draw shaped room
      const bounds = roomShapeService.getRoomBounds(room);
      const { gx: gx1, gy: gy1 } = worldToGrid(bounds.minX, bounds.minY);
      const { gx: gx2, gy: gy2 } = worldToGrid(bounds.maxX, bounds.maxY);
      
      for (let gy = gy1; gy <= gy2; gy++) {
        for (let gx = gx1; gx <= gx2; gx++) {
          if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
            const worldX = minX + gx / scale;
            const worldY = minY + gy / scale;
            
            if (roomShapeService.isPointInRoom(room, worldX, worldY)) {
              // Check if it's a border point
              const isBorder = !roomShapeService.isPointInRoom(room, worldX - 1/scale, worldY) ||
                              !roomShapeService.isPointInRoom(room, worldX + 1/scale, worldY) ||
                              !roomShapeService.isPointInRoom(room, worldX, worldY - 1/scale) ||
                              !roomShapeService.isPointInRoom(room, worldX, worldY + 1/scale);
              
              grid[gy][gx] = isBorder ? '#' : '.';
            }
          }
        }
      }
    }
    
    // Draw room center if requested
    if (showRoomCenters) {
      const centerX = room.x + room.w / 2;
      const centerY = room.y + room.h / 2;
      const { gx, gy } = worldToGrid(centerX, centerY);
      
      if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
        grid[gy][gx] = '○';
      }
    }
    
    // Draw room number
    const numberX = room.x + room.w / 2;
    const numberY = room.y + room.h / 2;
    const { gx: ngx, gy: ngy } = worldToGrid(numberX, numberY);
    
    // Offset room number slightly to avoid center marker
    const numberOffsetX = ngx + 1;
    const numberOffsetY = ngy;
    
    if (numberOffsetY >= 0 && numberOffsetY < height && numberOffsetX >= 0 && numberOffsetX < width) {
      const roomNumber = d.rooms.indexOf(room) + 1;
      grid[numberOffsetY][numberOffsetX] = roomNumber.toString();
    }
  }
  
  // Draw doors if requested
  if (showDoors && d.doors) {
    for (const door of d.doors) {
      if (door.location) {
        const { gx, gy } = worldToGrid(door.location.x, door.location.y);
        if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
          grid[gy][gx] = 'D';
        }
      }
    }
  }
  
  // Draw corridor connection analysis if requested
  if (showCorridorConnections) {
    for (const corridor of d.corridors) {
      if (corridor.path.length > 0) {
        // Mark corridor start and end points with special characters
        const start = corridor.path[0];
        const end = corridor.path[corridor.path.length - 1];
        
        const { gx: sx, gy: sy } = worldToGrid(start.x, start.y);
        const { gx: ex, gy: ey } = worldToGrid(end.x, end.y);
        
        if (sy >= 0 && sy < height && sx >= 0 && sx < width) {
          grid[sy][sx] = 'S';  // Start
        }
        if (ey >= 0 && ey < height && ex >= 0 && ex < width) {
          grid[ey][ex] = 'E';  // End
        }
        
        // If corridor has door connection points, show them
        if ('doorStart' in corridor && corridor.doorStart) {
          const { gx: dsx, gy: dsy } = worldToGrid(corridor.doorStart.x, corridor.doorStart.y);
          if (dsy >= 0 && dsy < height && dsx >= 0 && dsx < width) {
            grid[dsy][dsx] = '◄';  // Door start connection
          }
        }
        if ('doorEnd' in corridor && corridor.doorEnd) {
          const { gx: dex, gy: dey } = worldToGrid(corridor.doorEnd.x, corridor.doorEnd.y);
          if (dey >= 0 && dey < height && dex >= 0 && dex < width) {
            grid[dey][dex] = '►';  // Door end connection
          }
        }
      }
    }
  }

  // Draw keys if requested (this is the critical part for debugging!)
  if (showKeys && d.keyItems) {
    for (const key of d.keyItems) {
      const room = d.rooms.find(r => r.id === key.locationId);
      if (room) {
        // Calculate key position exactly like SVG renderer
        const keyX = room.x + room.w / 2;              // Horizontal center
        const keyY = room.y + room.h / 2 - 0.4;        // Slightly above center (like SVG)
        const { gx, gy } = worldToGrid(keyX, keyY);
        
        if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
          grid[gy][gx] = 'K';  // Use 'K' for key
        }
        
        // Also mark the actual room center for comparison
        const centerX = room.x + room.w / 2;
        const centerY = room.y + room.h / 2;
        const { gx: cgx, gy: cgy } = worldToGrid(centerX, centerY);
        
        // Mark center with a different character for comparison
        if (cgy >= 0 && cgy < height && cgx >= 0 && cgx < width && grid[cgy][cgx] === '.') {
          grid[cgy][cgx] = '×';  // Mark center with ×
        }
      }
    }
  }
  
  // Convert grid to string with coordinate labels
  const lines: string[] = [];
  
  // Add header with world coordinate info
  lines.push(`Debug ASCII Render (Scale: ${scale}x)`);
  lines.push(`World bounds: (${minX.toFixed(1)}, ${minY.toFixed(1)}) to (${maxX.toFixed(1)}, ${maxY.toFixed(1)})`);
  lines.push(`Grid size: ${width} × ${height}`);
  lines.push(`Legend: # = wall, . = floor, + = corridor, D = door, K = key, ○ = room center, × = center mark, 1-9 = room number`);
  lines.push(`        S = corridor start, E = corridor end, ◄ = door start connection, ► = door end connection`);
  lines.push('');
  
  // Add Y coordinate labels and grid content
  for (let y = 0; y < height; y++) {
    const worldY = minY + y / scale;
    const yLabel = y % (scale * 2) === 0 ? worldY.toFixed(0).padStart(3) : '   ';
    lines.push(yLabel + '|' + grid[y].join(''));
  }
  
  // Add X coordinate labels  
  let xLabelLine = '   |';
  for (let x = 0; x < width; x++) {
    const worldX = minX + x / scale;
    if (x % (scale * 2) === 0) {
      const label = worldX.toFixed(0);
      xLabelLine += label.charAt(0) || ' ';
    } else {
      xLabelLine += ' ';
    }
  }
  lines.push(xLabelLine);
  
  return lines.join('\n');
}

// Export function for CLI use
export default renderDebugAscii;