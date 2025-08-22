import type { Dungeon, Room } from '../../core/types';
import type { ExportPlugin, ExportOptions, ExportResult } from '../../core/plugin-types';
import { roomShapeService } from '../../services/room-shapes';
import { calculateGridBounds } from '../../utils/grid-utils';
import { isPointOnRoomBorder } from '../../utils/room-utils';
import { distance, distanceFromPointToLineSegment } from '../../utils/geometry';
import { axialToPixel } from '../../services/hex-grid';

// Theme interfaces and definitions
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

export interface SVGRenderOptions {
  /** Style variant for SVG rendering */
  style?: "classic" | "hand-drawn" | "hex";
  /** Theme selection */
  theme?: 'light' | 'dark' | 'sepia' | RenderTheme;
  /** Cell size in pixels */
  cellSize?: number;
  /** Show subtle grid background for technical pen style */
  showGrid?: boolean;
  /** Line wobble intensity for hand-drawn style (0-2) */
  wobbleIntensity?: number;
  /** Wall thickness multiplier for hand-drawn style */
  wallThickness?: number;
  /** Radius of a single hex in pixels for hex style */
  hexSize?: number;
}

class SVGExportPlugin implements ExportPlugin {
  metadata = {
    id: 'svg-export',
    version: '1.0.0',
    description: 'Core SVG export plugin with theme support and visual customization',
    author: 'DOA Core',
    tags: ['export', 'svg', 'core', 'visual']
  };

  supportedFormats = ['svg'];

  async export(dungeon: Dungeon, format: string, options: ExportOptions = {}): Promise<ExportResult> {
    if (format !== 'svg') {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Extract SVG-specific options
    const svgOptions: SVGRenderOptions = {
      style: options.style as any ?? 'classic',
      theme: options.theme as any ?? 'light',
      cellSize: options.cellSize as number ?? 20,
      showGrid: options.showGrid as boolean ?? false,
      wobbleIntensity: options.wobbleIntensity as number ?? 1,
      wallThickness: options.wallThickness as number ?? 1,
      hexSize: options.hexSize as number ?? 20,
    };

    const svgContent = await this.renderSvg(dungeon, svgOptions);

    return {
      format: 'svg',
      data: svgContent,
      contentType: 'image/svg+xml',
      filename: options.filename ?? 'dungeon.svg',
      metadata: options.metadata
    };
  }

  private async renderSvg(d: Dungeon, opts: SVGRenderOptions): Promise<string> {
    const style = opts.style ?? "classic";
    const showGrid = opts.showGrid ?? false;
    const hexSize = opts.hexSize ?? 20;
    const wobbleIntensity = opts.wobbleIntensity ?? 1;
    const wallThickness = opts.wallThickness ?? 1;
    const cellSize = opts.cellSize ?? 20;
    
    // Resolve theme
    const theme = this.resolveTheme(opts.theme ?? 'light');
    const rng = d.rng ?? Math.random;

    // Built-in hex rendering
    if (style === "hex") {
      return this.renderHexSvg(d, theme, { hexSize, showGrid });
    }

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
    const svgBounds = calculateGridBounds(points);
    const width = svgBounds.width * cellSize;
    const height = svgBounds.height * cellSize;
    
    const parts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ];

    // Classic style rendering
    parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${theme.background}"/>`);

    // Render corridors
    for (const c of d.corridors) {
      for (const p of c.path) {
        parts.push(
          `<rect x="${p.x * cellSize}" y="${p.y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${theme.corridorFill}" stroke="none"/>`,
        );
      }
      if (c.path.length > 0) {
        const start = c.path[0];
        const end = c.path[c.path.length - 1];
        const fromRoom = d.rooms.find((r) => r.id === c.from);
        const toRoom = d.rooms.find((r) => r.id === c.to);
        if (fromRoom) {
          const doorPosition = c.doorStart || start;
          const edge = this.doorEdge(fromRoom, doorPosition);
          if (edge)
            parts.push(
              `<line class="door-icon" data-door="${c.id}-start" x1="${edge.x1 * cellSize}" y1="${edge.y1 * cellSize}" x2="${edge.x2 * cellSize}" y2="${edge.y2 * cellSize}" stroke="${theme.roomStroke}" stroke-width="${cellSize * 0.2}"/>`,
            );
        }
        if (toRoom) {
          const doorPosition = c.doorEnd || end;
          const edge = this.doorEdge(toRoom, doorPosition);
          if (edge)
            parts.push(
              `<line class="door-icon" data-door="${c.id}-end" x1="${edge.x1 * cellSize}" y1="${edge.y1 * cellSize}" x2="${edge.x2 * cellSize}" y2="${edge.y2 * cellSize}" stroke="${theme.roomStroke}" stroke-width="${cellSize * 0.2}"/>`,
            );
        }
      }
    }

    // Render rooms
    d.rooms.forEach((r, i) => {
      if (r.shape === "rectangular" || !r.shapePoints) {
        parts.push(
          `<rect class="room-shape" data-room="${i + 1}" x="${r.x * cellSize}" y="${r.y * cellSize}" width="${r.w * cellSize}" height="${r.h * cellSize}" fill="${theme.roomFill}" stroke="${theme.roomStroke}"/>`,
        );
        const cx = (r.x + r.w / 2) * cellSize;
        const cy = (r.y + r.h / 2) * cellSize;
        parts.push(
          `<text class="room-number" data-room="${i + 1}" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${cellSize * 0.6}" fill="${theme.textFill}">${i + 1}</text>`,
        );
      } else {
        const points = r.shapePoints!.map((p) => `${p.x * cellSize},${p.y * cellSize}`).join(" ");
        parts.push(
          `<polygon class="room-shape" data-room="${i + 1}" points="${points}" fill="${theme.roomFill}" stroke="${theme.roomStroke}"/>`,
        );
        const cx = r.x * cellSize;
        const cy = r.y * cellSize;
        parts.push(
          `<text class="room-number" data-room="${i + 1}" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${cellSize * 0.6}" fill="${theme.textFill}">${i + 1}</text>`,
        );
      }
    });

    // Render key items
    (d.keyItems || []).forEach(key => {
      const room = d.rooms.find(r => r.id === key.locationId);
      if (!room) return;
      const cx = (room.x + room.w / 2) * cellSize;
      const cy = (room.y + room.h / 2) * cellSize - cellSize * 0.4;
      parts.push(
        `<text class="key-icon" data-key="${key.id}" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${cellSize * 0.5}" fill="${theme.textFill}">&#x1F511;</text>`
      );
    });

    parts.push("</svg>");
    return parts.join("");
  }

  private resolveTheme(theme: 'light' | 'dark' | 'sepia' | RenderTheme): RenderTheme {
    if (typeof theme === 'object') {
      // Validate custom theme object
      if (!this.isValidTheme(theme)) {
        console.warn('Invalid custom theme provided, falling back to light theme:', theme);
        return lightTheme;
      }
      return theme;
    }
    
    switch (theme) {
      case 'dark':
        return darkTheme;
      case 'sepia':
        return sepiaTheme;
      case 'light':
        return lightTheme;
      default:
        console.warn(`Unknown theme '${theme}', falling back to light theme`);
        return lightTheme;
    }
  }

  private isValidTheme(theme: any): theme is RenderTheme {
    return (
      theme &&
      typeof theme === 'object' &&
      typeof theme.background === 'string' &&
      typeof theme.corridorFill === 'string' &&
      typeof theme.roomFill === 'string' &&
      typeof theme.roomStroke === 'string' &&
      typeof theme.textFill === 'string'
    );
  }

  /**
   * Get available built-in themes
   */
  getAvailableThemes(): { [key: string]: RenderTheme } {
    return {
      light: lightTheme,
      dark: darkTheme,
      sepia: sepiaTheme,
    };
  }

  /**
   * Create a custom theme by extending a base theme
   */
  createCustomTheme(baseTheme: 'light' | 'dark' | 'sepia', overrides: Partial<RenderTheme>): RenderTheme {
    const base = this.resolveTheme(baseTheme);
    return {
      ...base,
      ...overrides,
    };
  }

  private doorEdge(room: Room, doorPosition: { x: number; y: number }) {
    // For non-rectangular rooms, use shape-aware door rendering
    if (room.shape !== 'rectangular' && room.shapePoints) {
      return this.renderShapedRoomDoor(room, doorPosition);
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

  private renderShapedRoomDoor(room: Room, doorPosition: { x: number; y: number }) {
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

  private renderHexSvg(d: Dungeon, theme: RenderTheme, opts: { hexSize: number; showGrid: boolean }): string {
    const size = opts.hexSize;
    const cells: { q: number; r: number; type: "room" | "corridor" }[] = [];

    for (const r of d.rooms) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          cells.push({ q: x, r: y, type: "room" });
        }
      }
    }
    for (const c of d.corridors) {
      for (const p of c.path) {
        cells.push({ q: p.x, r: p.y, type: "corridor" });
      }
    }

    if (!cells.length) {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" />';
    }

    let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
    for (const c of cells) {
      if (c.q < minQ) minQ = c.q;
      if (c.q > maxQ) maxQ = c.q;
      if (c.r < minR) minR = c.r;
      if (c.r > maxR) maxR = c.r;
    }

    const hexWidth = Math.sqrt(3) * size;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let q = minQ - 1; q <= maxQ + 1; q++) {
      for (let r = minR - 1; r <= maxR + 1; r++) {
        const { x, y } = axialToPixel({ q, r }, size);
        const left = x - hexWidth / 2;
        const right = x + hexWidth / 2;
        const top = y - size;
        const bottom = y + size;
        if (left < minX) minX = left;
        if (right > maxX) maxX = right;
        if (top < minY) minY = top;
        if (bottom > maxY) maxY = bottom;
      }
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const parts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<rect x="0" y="0" width="${width}" height="${height}" fill="${theme.background}"/>`,
    ];

    if (opts.showGrid) {
      for (let r = minR - 1; r <= maxR + 1; r++) {
        for (let q = minQ - 1; q <= maxQ + 1; q++) {
          const { x, y } = axialToPixel({ q, r }, size);
          const cx = x - minX;
          const cy = y - minY;
          const pts = this.hexPolygonPoints(cx, cy, size);
          parts.push(
            `<polygon class="hex-grid" points="${pts}" fill="none" stroke="${theme.corridorFill}" stroke-width="0.5"/>`,
          );
        }
      }
    }

    for (const cell of cells) {
      const { x, y } = axialToPixel({ q: cell.q, r: cell.r }, size);
      const cx = x - minX;
      const cy = y - minY;
      const pts = this.hexPolygonPoints(cx, cy, size);
      const fill = cell.type === "room" ? theme.roomFill : theme.corridorFill;
      const stroke = cell.type === "room" ? theme.roomStroke : "none";
      parts.push(`<polygon class="hex-cell" points="${pts}" fill="${fill}" stroke="${stroke}"/>`);
    }

    parts.push("</svg>");
    return parts.join("");
  }

  private hexPolygonPoints(cx: number, cy: number, size: number): string {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      pts.push(`${x},${y}`);
    }
    return pts.join(" ");
  }
}

// Export the plugin instance
export default new SVGExportPlugin();