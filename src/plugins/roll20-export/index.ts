import type { Dungeon } from '../../core/types';
import type { ExportPlugin, ExportOptions, ExportResult, PluginMetadata } from '../../core/plugin-types';

export interface Roll20ExportOptions extends ExportOptions {
  /** Size of a single grid square in pixels */
  gridSize?: number;
}

interface Roll20Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Roll20Token {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  type: string;
  notes?: string;
}

interface Roll20Page {
  width: number;
  height: number;
  scale: number;
  walls: Roll20Wall[];
  tokens: Roll20Token[];
}

export const metadata: PluginMetadata = {
  id: 'roll20-export',
  version: '1.0.0',
  description: 'Export dungeons for Roll20 VTT platform',
  author: 'DOA Community',
  tags: ['export', 'roll20', 'vtt', 'virtual-tabletop'],
};

function splitWall(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  doors: { x: number; y: number }[],
  orientation: 'horizontal' | 'vertical',
  grid: number
): Roll20Wall[] {
  if (orientation === 'horizontal') {
    const dDoors = doors
      .filter((d) => d.y === y1 / grid && d.x >= Math.min(x1, x2) / grid && d.x < Math.max(x1, x2) / grid)
      .map((d) => d.x)
      .sort((a, b) => a - b);
    if (dDoors.length === 0) return [{ x1, y1, x2, y2 }];
    const segments: Roll20Wall[] = [];
    let start = x1;
    for (const dx of dDoors) {
      const px = dx * grid;
      if (px > start) segments.push({ x1: start, y1, x2: px, y2 });
      start = px + grid;
    }
    if (start < x2) segments.push({ x1: start, y1, x2, y2 });
    return segments;
  } else {
    const dDoors = doors
      .filter((d) => d.x === x1 / grid && d.y >= Math.min(y1, y2) / grid && d.y < Math.max(y1, y2) / grid)
      .map((d) => d.y)
      .sort((a, b) => a - b);
    if (dDoors.length === 0) return [{ x1, y1, x2, y2 }];
    const segments: Roll20Wall[] = [];
    let start = y1;
    for (const dy of dDoors) {
      const py = dy * grid;
      if (py > start) segments.push({ x1, y1: start, x2, y2: py });
      start = py + grid;
    }
    if (start < y2) segments.push({ x1, y1: start, x2, y2 });
    return segments;
  }
}

function buildWalls(d: Dungeon, grid: number): Roll20Wall[] {
  const walls: Roll20Wall[] = [];
  const doorMap: Map<string, { x: number; y: number }[]> = new Map();
  for (const door of d.doors || []) {
    if (door.fromRoom) {
      const arr = doorMap.get(door.fromRoom) || [];
      if (door.location) arr.push(door.location);
      doorMap.set(door.fromRoom, arr);
    }
    if (door.toRoom) {
      const arr = doorMap.get(door.toRoom) || [];
      if (door.location) arr.push(door.location);
      doorMap.set(door.toRoom, arr);
    }
  }
  for (const room of d.rooms) {
    if (room.shape !== 'rectangular') continue; // only handle rectangles for now
    const x1 = room.x * grid;
    const y1 = room.y * grid;
    const x2 = (room.x + room.w) * grid;
    const y2 = (room.y + room.h) * grid;
    const doors = doorMap.get(room.id) || [];
    walls.push(...splitWall(x1, y1, x2, y1, doors, 'horizontal', grid)); // top
    walls.push(...splitWall(x1, y2, x2, y2, doors, 'horizontal', grid)); // bottom
    walls.push(...splitWall(x1, y1, x1, y2, doors, 'vertical', grid)); // left
    walls.push(...splitWall(x2, y1, x2, y2, doors, 'vertical', grid)); // right
  }
  return walls;
}

function buildTokens(d: Dungeon, grid: number): Roll20Token[] {
  const tokens: Roll20Token[] = [];
  for (const room of d.rooms) {
    const centerX = (room.x + room.w / 2) * grid;
    const centerY = (room.y + room.h / 2) * grid;
    const encounter = d.encounters?.[room.id];
    encounter?.monsters?.forEach((m) => {
      tokens.push({ x: centerX, y: centerY, width: grid, height: grid, name: m.name, type: 'monster', notes: m.notes });
    });
    encounter?.traps?.forEach((t) => {
      tokens.push({ x: centerX, y: centerY, width: grid, height: grid, name: t.name, type: 'trap', notes: t.notes });
    });
    encounter?.treasure?.forEach((t) => {
      tokens.push({ x: centerX, y: centerY, width: grid, height: grid, name: t.kind, type: 'treasure' });
    });
  }
  return tokens;
}

function generateRoll20Page(d: Dungeon, grid: number): Roll20Page {
  const points: { x: number; y: number }[] = [];
  for (const r of d.rooms) points.push({ x: r.x + r.w, y: r.y + r.h });
  for (const c of d.corridors) c.path.forEach((p) => points.push(p));
  const maxX = Math.max(0, ...points.map((p) => p.x));
  const maxY = Math.max(0, ...points.map((p) => p.y));
  return {
    width: (maxX + 1) * grid,
    height: (maxY + 1) * grid,
    scale: grid,
    walls: buildWalls(d, grid),
    tokens: buildTokens(d, grid),
  };
}

export const roll20ExportPlugin: ExportPlugin = {
  metadata,
  supportedFormats: ['roll20'],

  export(dungeon: Dungeon, format: string, options?: Roll20ExportOptions): ExportResult {
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}. Supported formats: ${this.supportedFormats.join(', ')}`);
    }
    const gridSize = options?.gridSize ?? 70;
    const page = generateRoll20Page(dungeon, gridSize);
    return {
      format,
      data: page,
      contentType: 'application/json',
      filename: options?.filename || 'dungeon-roll20.json',
      metadata: { gridSize },
    };
  },

  initialize() {
    // No initialization needed for Roll20 export
  },

  cleanup() {
    // No cleanup needed for Roll20 export
  },

  getDefaultConfig() {
    return { gridSize: 70 };
  },
};

export default roll20ExportPlugin;
