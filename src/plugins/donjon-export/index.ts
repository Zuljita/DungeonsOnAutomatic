import type { Dungeon } from '../../core/types';
import type { ExportPlugin, ExportOptions, ExportResult, PluginMetadata } from '../../core/plugin-types';
import { roomShapeService } from '../../services/room-shapes';
import { calculateGridBounds, createGrid, isInBounds } from '../../utils/grid-utils';
import { isRectangularRoom } from '../../utils/room-utils';

function renderDonjonTSV(d: Dungeon): string {
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
  const bounds = calculateGridBounds(points);
  const grid = createGrid(bounds.width, bounds.height, '');

  const markFloor = (x: number, y: number) => {
    if (isInBounds(x, y, bounds.width, bounds.height)) {
      if (!grid[y][x]) grid[y][x] = 'F';
    }
  };

  for (const r of d.rooms) {
    if (isRectangularRoom(r)) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          markFloor(x, y);
        }
      }
    } else {
      const bounds = roomShapeService.getRoomBounds(r);
      for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y++) {
        for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x++) {
          if (roomShapeService.isPointInRoom(r, x, y)) markFloor(x, y);
        }
      }
    }
  }

  const doorCode = (from: {x:number;y:number}, to: {x:number;y:number}) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 1) return 'DR';
    if (dx === -1) return 'DL';
    if (dy === 1) return 'DB';
    if (dy === -1) return 'DT';
    return 'D';
  };

  for (const c of d.corridors) {
    for (const p of c.path) markFloor(p.x, p.y);
    if (c.path.length > 0) {
      const start = c.doorStart || c.path[0];
      const end = c.doorEnd || c.path[c.path.length - 1];
      const next = c.path[1] || start;
      const prev = c.path[c.path.length - 2] || end;
      grid[start.y][start.x] = doorCode(start, next);
      grid[end.y][end.x] = doorCode(prev, end);
    }
  }

  return grid.map((row) => row.join('\t')).join('\n');
}

export const metadata: PluginMetadata = {
  id: 'donjon-export',
  version: '1.0.0',
  description: 'Export dungeons as DonJon-compatible TSV files',
  author: 'DOA Community',
  tags: ['export', 'donjon', 'tsv', 'traditional'],
};

export const donjonExportPlugin: ExportPlugin = {
  metadata,
  supportedFormats: ['donjon', 'tsv'],

  export(dungeon: Dungeon, format: string, options?: ExportOptions): ExportResult {
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }

    const data = renderDonjonTSV(dungeon);

    return {
      format,
      data,
      contentType: 'text/tab-separated-values',
      filename: options?.filename || `dungeon.${format}`,
    };
  },

  initialize() {},
  cleanup() {},
  getDefaultConfig() { return {}; },
};

export default donjonExportPlugin;
