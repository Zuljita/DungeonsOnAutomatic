import type { Dungeon } from '../../core/types';
import type { ExportPlugin, ExportOptions, ExportResult, PluginMetadata } from '../../core/plugin-types';
import { roomShapeService } from '../../services/room-shapes';

export interface AsciiExportOptions extends ExportOptions {
  characters?: {
    roomBorder?: string;
    roomInterior?: string;
    corridor?: string;
    door?: string;
    empty?: string;
  };
  compact?: boolean;
  debug?: boolean;
}

export const metadata: PluginMetadata = {
  id: 'ascii-export',
  version: '1.0.0',
  description: 'Export dungeons as ASCII text maps',
  author: 'DOA Core',
  tags: ['export', 'ascii', 'text', 'core']
};

/**
 * Render a simple ASCII map of the dungeon. Rooms are drawn with '#' borders
 * and '.' interiors; corridor tiles are marked with '+'. Door locations are
 * marked with 'D' on the corridor tile adjacent to the room. The map is
 * tightly cropped to the extents of the dungeon geometry.
 */
function renderAscii(d: Dungeon, options?: AsciiExportOptions): string {
  const chars = {
    roomBorder: '#',
    roomInterior: '.',
    corridor: '+',
    door: 'D',
    empty: ' ',
    ...options?.characters
  };

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
  const grid: string[][] = Array.from({ length: maxY }, () => Array(maxX).fill(chars.empty));

  for (const r of d.rooms) {
    if (r.shape === 'rectangular' || !r.shapePoints) {
      // Use original rectangular rendering for rectangular rooms
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          const border = x === r.x || x === r.x + r.w - 1 || y === r.y || y === r.y + r.h - 1;
          grid[y][x] = border ? chars.roomBorder : chars.roomInterior;
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
              grid[y][x] = isBorder ? chars.roomBorder : chars.roomInterior;
            }
          }
        }
      }
    }
  }
  for (const c of d.corridors) {
    for (const p of c.path) {
      if (grid[p.y]?.[p.x] === chars.empty) grid[p.y][p.x] = chars.corridor;
    }
    if (c.path.length > 0) {
      const start = c.path[0];
      const end = c.path[c.path.length - 1];
      grid[start.y][start.x] = chars.door;
      grid[end.y][end.x] = chars.door;
    }
  }

  // Add debug coordinates if requested
  if (options?.debug) {
    // Add coordinate markers at corners
    for (let y = 0; y < maxY; y += 5) {
      for (let x = 0; x < maxX; x += 5) {
        if (grid[y]?.[x] === chars.empty) {
          grid[y][x] = `${x % 10}`;
        }
      }
    }
  }

  return grid.map((row) => row.join("")).join("\n");
}

export const asciiExportPlugin: ExportPlugin = {
  metadata,
  supportedFormats: ['ascii', 'txt'],

  export(dungeon: Dungeon, format: string, options?: AsciiExportOptions): ExportResult {
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    // Validate character options
    if (options?.characters) {
      const { characters } = options;
      for (const [key, value] of Object.entries(characters)) {
        if (typeof value !== 'string' || value.length !== 1) {
          throw new Error(`Invalid character for ${key}: must be a single character string`);
        }
      }
    }

    const data = renderAscii(dungeon, options);
    
    return {
      format,
      data,
      contentType: 'text/plain',
      filename: options?.filename || `dungeon.${format}`,
      metadata: {
        characterCount: data.length,
        lineCount: data.split('\n').length,
        characters: options?.characters || 'default'
      }
    };
  },

  initialize() {
    // No initialization needed for ASCII export
  },

  cleanup() {
    // No cleanup needed for ASCII export
  },

  getDefaultConfig() {
    return {
      characters: {
        roomBorder: '#',
        roomInterior: '.',
        corridor: '+',
        door: 'D',
        empty: ' '
      },
      compact: false,
      debug: false
    };
  }
};

export default asciiExportPlugin;