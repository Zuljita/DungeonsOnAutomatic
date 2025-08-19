import { RoomShape, Room } from '../core/types';
import { type ShapePreferences } from '../core/plugin-types';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Re-export for backward compatibility
export type { ShapePreferences };

export interface RoomShapeService {
  initialize: () => Promise<void>;
  generateRoomShape: (preferences?: ShapePreferences, roomKind?: string, rng?: () => number) => RoomShape;
  generateShapePoints: (shape: RoomShape, centerX: number, centerY: number, width: number, height: number, rng?: () => number) => { x: number; y: number }[];
  isPointInRoom: (room: Room, x: number, y: number) => boolean;
  isPointOnRoomEdge: (room: Room, x: number, y: number) => boolean;
  getRoomBounds: (room: Room) => { minX: number, maxX: number, minY: number, maxY: number };
  findClosestEdgePoint: (room: Room, direction: 'top' | 'bottom' | 'left' | 'right', targetPoint: { x: number; y: number }) => { x: number; y: number };
}

// Plugin instance cache
let shapePlugin: any = null;

/**
 * Default shape preferences - ensures variety without excluding any shape
 */
const DEFAULT_PREFERENCES: ShapePreferences = {
  rectangular: 30,    // Most common for practical reasons
  circular: 15,       // Natural caves
  hexagonal: 12,      // Structured chambers  
  octagonal: 10,      // Formal rooms
  irregular: 10,      // Natural formations
  'L-shaped': 8,      // Complex chambers
  'T-shaped': 8,      // Intersecting areas
  cross: 7           // Central hubs
};

/**
 * Room-kind specific preferences
 */
const KIND_PREFERENCES: Record<string, Partial<ShapePreferences>> = {
  chamber: { rectangular: 25, circular: 20, hexagonal: 15, octagonal: 12 },
  hall: { rectangular: 40, 'L-shaped': 15, 'T-shaped': 10 },
  cavern: { circular: 30, irregular: 25, octagonal: 10 },
  lair: { irregular: 25, circular: 20, octagonal: 15 },
  special: { cross: 20, octagonal: 15, hexagonal: 12 }
};

/**
 * Create a built-in room shape plugin for browser environments
 */
function createBuiltInShapePlugin() {
  return {
    generateShape: (preferences?: ShapePreferences, roomKind?: string, rng = Math.random): RoomShape => {
      // Merge preferences with defaults and room-kind specifics
      const kindPrefs = roomKind ? KIND_PREFERENCES[roomKind] || {} : {};
      const mergedPrefs = { ...DEFAULT_PREFERENCES, ...kindPrefs, ...preferences };
      
      // Convert to weighted array
      const weightedShapes: { shape: RoomShape; weight: number }[] = [];
      for (const [shape, weight] of Object.entries(mergedPrefs)) {
        if (weight && weight > 0) {
          weightedShapes.push({ shape: shape as RoomShape, weight });
        }
      }
      
      // Random weighted selection
      const totalWeight = weightedShapes.reduce((sum, item) => sum + item.weight, 0);
      let random = rng() * totalWeight;
      
      for (const item of weightedShapes) {
        random -= item.weight;
        if (random <= 0) {
          return item.shape;
        }
      }
      
      return 'rectangular';
    },
    
    generateShapePoints: (shape: RoomShape, centerX: number, centerY: number, width: number, height: number, rng = Math.random): { x: number; y: number }[] => {
      switch (shape) {
        case 'rectangular':
          return generateRectangularPoints(centerX, centerY, width, height);
        case 'circular':
          return generateCircularPoints(centerX, centerY, Math.min(width, height) / 2, rng);
        case 'hexagonal':
          return generateHexagonalPoints(centerX, centerY, Math.min(width, height) / 2);
        case 'octagonal':
          return generateOctagonalPoints(centerX, centerY, Math.min(width, height) / 2);
        case 'irregular':
          return generateIrregularPoints(centerX, centerY, width, height, rng);
        case 'L-shaped':
          return generateLShapedPoints(centerX, centerY, width, height, rng);
        case 'T-shaped':
          return generateTShapedPoints(centerX, centerY, width, height, rng);
        case 'cross':
          return generateCrossPoints(centerX, centerY, width, height);
        default:
          return generateRectangularPoints(centerX, centerY, width, height);
      }
    }
  };
}

/**
 * Load the room shape plugin with fallback
 */
async function getShapePlugin() {
  if (shapePlugin) return shapePlugin;
  
  // In browser environment, skip plugin loading and use built-in shapes
  if (isBrowser) {
    console.info('Browser environment detected, using built-in room shapes');
    shapePlugin = createBuiltInShapePlugin();
    return shapePlugin;
  }
  
  try {
    // Dynamic import only in Node.js environment
    const { createDefaultPluginLoader } = await import('./plugin-loader');
    const { isRoomShapePlugin } = await import('../core/plugin-types');
    
    const pluginLoader = createDefaultPluginLoader();
    const plugin = await pluginLoader.load('room-shapes', { sandbox: false });
    if (isRoomShapePlugin(plugin)) {
      shapePlugin = plugin;
      return plugin;
    } else {
      throw new Error('room-shapes plugin is not a valid RoomShapePlugin');
    }
  } catch (err) {
    console.warn('Failed to load room-shapes plugin, using built-in fallback:', err);
    shapePlugin = createBuiltInShapePlugin();
    return shapePlugin;
  }
}

class RoomShapeServiceImpl implements RoomShapeService {
  /**
   * Initialize the room shape plugin
   */
  async initialize() {
    if (!shapePlugin) {
      shapePlugin = await getShapePlugin();
    }
  }
  /**
   * Generate a room shape based on preferences and room kind
   */
  generateRoomShape(preferences?: ShapePreferences, roomKind?: string, rng: () => number = Math.random): RoomShape {
    // This method needs to be synchronous for compatibility, so we'll need to handle this differently
    // Try to load plugin synchronously if not loaded
    if (!shapePlugin) {
      console.warn('Room shape plugin not loaded, using rectangular fallback');
      // Trigger async load for next time (don't await)
      this.initialize().catch(() => {});
      return 'rectangular';
    }
    return shapePlugin.generateShape(preferences, roomKind, rng);
  }

  /**
   * Generate shape points for a given shape
   */
  generateShapePoints(shape: RoomShape, centerX: number, centerY: number, width: number, height: number, rng: () => number = Math.random): { x: number; y: number }[] {
    // This method needs to be synchronous for compatibility
    if (!shapePlugin) {
      console.warn('Room shape plugin not loaded, using rectangular fallback');
      // Fallback rectangular implementation
      return [
        { x: centerX - width / 2, y: centerY - height / 2 },
        { x: centerX + width / 2, y: centerY - height / 2 },
        { x: centerX + width / 2, y: centerY + height / 2 },
        { x: centerX - width / 2, y: centerY + height / 2 }
      ];
    }
    return shapePlugin.generateShapePoints(shape, centerX, centerY, width, height, rng);
  }

  /**
   * Check if a point is inside a room considering its shape
   */
  isPointInRoom(room: Room, x: number, y: number): boolean {
    if (room.shape === 'rectangular') {
      return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
    }
    
    if (room.shapePoints) {
      return this.isPointInPolygon({ x, y }, room.shapePoints);
    }
    
    // Fallback to rectangular check
    const bounds = this.getRoomBounds(room);
    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
  }

  /**
   * Check if a point is ON a room's edge (wall), not inside
   */
  isPointOnRoomEdge(room: Room, x: number, y: number): boolean {
    if (room.shape === 'rectangular') {
      // For rectangular rooms, check if point is on any of the four walls (within room bounds)
      const onLeftWall = x === room.x && y >= room.y && y < room.y + room.h;
      const onRightWall = x === room.x + room.w - 1 && y >= room.y && y < room.y + room.h;
      const onTopWall = y === room.y && x >= room.x && x < room.x + room.w;
      const onBottomWall = y === room.y + room.h - 1 && x >= room.x && x < room.x + room.w;
      
      return onLeftWall || onRightWall || onTopWall || onBottomWall;
    }
    
    if (room.shapePoints) {
      // For shaped rooms, check if point lies on any edge of the polygon
      const point = { x, y };
      
      for (let i = 0; i < room.shapePoints.length; i++) {
        const start = room.shapePoints[i];
        const end = room.shapePoints[(i + 1) % room.shapePoints.length];
        
        // Check if point lies on this edge segment
        if (this.isPointOnLineSegment(point, start, end)) {
          return true;
        }
      }
      return false;
    }
    
    // Fallback: use rectangular edge check
    const bounds = this.getRoomBounds(room);
    const onLeftWall = x === bounds.minX && y >= bounds.minY && y <= bounds.maxY;
    const onRightWall = x === bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
    const onTopWall = y === bounds.minY && x >= bounds.minX && x <= bounds.maxX;
    const onBottomWall = y === bounds.maxY && x >= bounds.minX && x <= bounds.maxX;
    
    return onLeftWall || onRightWall || onTopWall || onBottomWall;
  }

  /**
   * Get bounding box for any room shape
   */
  getRoomBounds(room: Room): { minX: number, maxX: number, minY: number, maxY: number } {
    if (room.shape === 'rectangular') {
      return {
        minX: room.x,
        maxX: room.x + room.w,
        minY: room.y,
        maxY: room.y + room.h
      };
    }
    
    if (room.shapePoints && room.shapePoints.length > 0) {
      const xs = room.shapePoints.map(p => p.x);
      const ys = room.shapePoints.map(p => p.y);
      return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys)
      };
    }
    
    // Fallback for circular/regular shapes
    const radius = Math.min(room.w, room.h) / 2;
    return {
      minX: room.x - radius,
      maxX: room.x + radius,
      minY: room.y - radius,
      maxY: room.y + radius
    };
  }


  /**
   * Find the closest point on a room's edge in the specified direction
   * Returns a point ON the room wall where a door should be placed
   */
  findClosestEdgePoint(room: Room, direction: 'top' | 'bottom' | 'left' | 'right', targetPoint: { x: number; y: number }): { x: number; y: number } {
    if (room.shape === 'rectangular' || !room.shapePoints) {
      // For rectangular rooms, find a point ON the edge wall
      switch (direction) {
        case 'top':
          return { x: Math.floor(Math.max(room.x, Math.min(room.x + room.w - 1, targetPoint.x))), y: room.y };
        case 'bottom':
          return { x: Math.floor(Math.max(room.x, Math.min(room.x + room.w - 1, targetPoint.x))), y: room.y + room.h };
        case 'left':
          return { x: room.x, y: Math.floor(Math.max(room.y, Math.min(room.y + room.h - 1, targetPoint.y))) };
        case 'right':
          return { x: room.x + room.w, y: Math.floor(Math.max(room.y, Math.min(room.y + room.h - 1, targetPoint.y))) };
      }
    } else {
      // For shaped rooms, find the actual closest point ON the wall edge
      return this.findClosestPointOnShapeEdge(room, direction, targetPoint);
    }
  }

  /**
   * Find the closest point ON a shaped room's actual wall edge (not outside it)
   */
  private findClosestPointOnShapeEdge(room: Room, direction: 'top' | 'bottom' | 'left' | 'right', targetPoint: { x: number; y: number }): { x: number; y: number } {
    if (!room.shapePoints) {
      throw new Error('Room has no shape points');
    }

    const shapePoints = room.shapePoints;
    const roomCenter = this.getRoomCenter(room);
    let bestPoint = { x: room.x, y: room.y };
    let bestDistance = Infinity;

    // Check each edge of the polygon
    for (let i = 0; i < shapePoints.length; i++) {
      const currentPoint = shapePoints[i];
      const nextPoint = shapePoints[(i + 1) % shapePoints.length];
      
      // Check if this edge is in the correct direction
      const edgeCenter = {
        x: (currentPoint.x + nextPoint.x) / 2,
        y: (currentPoint.y + nextPoint.y) / 2
      };
      
      if (!this.isPointInCorrectDirection(edgeCenter, roomCenter, direction)) {
        continue; // Skip edges not facing the right direction
      }
      
      // Find the closest point on this edge segment to the target
      const closestOnSegment = this.getClosestPointOnLineSegment(
        currentPoint, 
        nextPoint, 
        targetPoint
      );
      
      const distance = this.getDistance(closestOnSegment, targetPoint);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPoint = closestOnSegment;
      }
    }

    // Return the point ON the wall edge, not outside it
    // Round to integer coordinates for grid alignment
    return {
      x: Math.round(bestPoint.x),
      y: Math.round(bestPoint.y)
    };
  }

  /**
   * Get points along an edge between two vertices
   */
  private getPointsAlongEdge(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const steps = Math.max(dx, dy);
    
    if (steps === 0) {
      return [start];
    }
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(start.x + (end.x - start.x) * t);
      const y = Math.round(start.y + (end.y - start.y) * t);
      points.push({ x, y });
    }
    
    return points;
  }

  /**
   * Check if a point is in the correct direction from room center
   */
  private isPointInCorrectDirection(point: { x: number; y: number }, roomCenter: { x: number; y: number }, direction: 'top' | 'bottom' | 'left' | 'right'): boolean {
    switch (direction) {
      case 'top': return point.y <= roomCenter.y;
      case 'bottom': return point.y >= roomCenter.y;
      case 'left': return point.x <= roomCenter.x;
      case 'right': return point.x >= roomCenter.x;
    }
  }

  /**
   * Get the center of a room accounting for shape
   */
  private getRoomCenter(room: Room): { x: number; y: number } {
    if (room.shape === 'rectangular' || !room.shapePoints) {
      return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
    } else {
      const bounds = this.getRoomBounds(room);
      return { 
        x: (bounds.minX + bounds.maxX) / 2, 
        y: (bounds.minY + bounds.maxY) / 2 
      };
    }
  }

  /**
   * Calculate distance between two points
   */
  private getDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if a point lies exactly on a line segment
   */
  private isPointOnLineSegment(
    point: { x: number; y: number },
    segmentStart: { x: number; y: number }, 
    segmentEnd: { x: number; y: number }
  ): boolean {
    // Calculate the distance from point to the line segment
    const closestPoint = this.getClosestPointOnLineSegment(segmentStart, segmentEnd, point);
    
    // Check if the closest point is very close to the original point (accounting for floating point precision)
    const distance = this.getDistance(point, closestPoint);
    return distance < 1; // Allow 1 unit tolerance for integer coordinates
  }

  /**
   * Find the closest point on a line segment to a target point
   */
  private getClosestPointOnLineSegment(
    segmentStart: { x: number; y: number }, 
    segmentEnd: { x: number; y: number }, 
    targetPoint: { x: number; y: number }
  ): { x: number; y: number } {
    const dx = segmentEnd.x - segmentStart.x;
    const dy = segmentEnd.y - segmentStart.y;
    
    // If the segment is just a point, return that point
    if (dx === 0 && dy === 0) {
      return segmentStart;
    }
    
    // Calculate the parameter t for the closest point on the line
    const t = Math.max(0, Math.min(1, 
      ((targetPoint.x - segmentStart.x) * dx + (targetPoint.y - segmentStart.y) * dy) / (dx * dx + dy * dy)
    ));
    
    // Return the point on the line segment
    return {
      x: segmentStart.x + t * dx,
      y: segmentStart.y + t * dy
    };
  }

  /**
   * Adjust a point to be outside the room for corridor connection
   * For shaped rooms, we want to be as close as possible to the actual edge
   */
  private adjustPointOutsideRoom(point: { x: number; y: number }, room: Room, direction: 'top' | 'bottom' | 'left' | 'right'): { x: number; y: number } {
    // First, check if the point is already outside the room
    if (!this.isPointInRoom(room, point.x, point.y)) {
      return point;
    }
    
    // Find the closest point outside the room in the specified direction
    let testPoint = { ...point };
    let step = 1;
    const maxSteps = 10; // Safety limit
    
    while (step <= maxSteps) {
      switch (direction) {
        case 'top': testPoint = { x: point.x, y: point.y - step }; break;
        case 'bottom': testPoint = { x: point.x, y: point.y + step }; break;
        case 'left': testPoint = { x: point.x - step, y: point.y }; break;
        case 'right': testPoint = { x: point.x + step, y: point.y }; break;
      }
      
      if (!this.isPointInRoom(room, testPoint.x, testPoint.y)) {
        return testPoint;
      }
      step++;
    }
    
    // Fallback to simple adjustment
    switch (direction) {
      case 'top': return { x: point.x, y: point.y - 1 };
      case 'bottom': return { x: point.x, y: point.y + 1 };
      case 'left': return { x: point.x - 1, y: point.y };
      case 'right': return { x: point.x + 1, y: point.y };
    }
  }

  // Point-in-polygon test using ray casting algorithm
  private isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }
}

// Built-in shape generation functions (for browser compatibility)
function generateRectangularPoints(centerX: number, centerY: number, width: number, height: number): { x: number; y: number }[] {
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;
  
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom }
  ];
}

function generateCircularPoints(centerX: number, centerY: number, radius: number, rng: () => number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const numPoints = 16 + Math.floor(rng() * 8);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    const radiusVariation = 0.9 + rng() * 0.2;
    const actualRadius = radius * radiusVariation;
    
    const x = centerX + Math.cos(angle) * actualRadius;
    const y = centerY + Math.sin(angle) * actualRadius;
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  
  return points;
}

function generateHexagonalPoints(centerX: number, centerY: number, radius: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  
  return points;
}

function generateOctagonalPoints(centerX: number, centerY: number, radius: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  
  return points;
}

function generateIrregularPoints(centerX: number, centerY: number, width: number, height: number, rng: () => number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const numPoints = 6 + Math.floor(rng() * 6);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    const radiusX = (width / 2) * (0.6 + rng() * 0.4);
    const radiusY = (height / 2) * (0.6 + rng() * 0.4);
    
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;
    points.push({ x: Math.round(x), y: Math.round(y) });
  }
  
  return points;
}

function generateLShapedPoints(centerX: number, centerY: number, width: number, height: number, rng: () => number): { x: number; y: number }[] {
  const orientation = Math.floor(rng() * 4);
  const cutSize = 0.3 + rng() * 0.3;
  
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;
  
  const cutW = width * cutSize;
  const cutH = height * cutSize;
  
  switch (orientation) {
    case 0:
      return [
        { x: left, y: top },
        { x: right - cutW, y: top },
        { x: right - cutW, y: top + cutH },
        { x: right, y: top + cutH },
        { x: right, y: bottom },
        { x: left, y: bottom }
      ];
    case 1:
      return [
        { x: left + cutW, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
        { x: left, y: top + cutH },
        { x: left + cutW, y: top + cutH }
      ];
    case 2:
      return [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left + cutW, y: bottom },
        { x: left + cutW, y: bottom - cutH },
        { x: left, y: bottom - cutH }
      ];
    default:
      return [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom - cutH },
        { x: right - cutW, y: bottom - cutH },
        { x: right - cutW, y: bottom },
        { x: left, y: bottom }
      ];
  }
}

function generateTShapedPoints(centerX: number, centerY: number, width: number, height: number, rng: () => number): { x: number; y: number }[] {
  const orientation = Math.floor(rng() * 4);
  const stemRatio = 0.3 + rng() * 0.2;
  
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;
  
  switch (orientation) {
    case 0: // T pointing up
      const stemW = width * stemRatio;
      const stemLeft = centerX - stemW / 2;
      const stemRight = centerX + stemW / 2;
      const crossH = height * 0.4;
      return [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: top + crossH },
        { x: stemRight, y: top + crossH },
        { x: stemRight, y: bottom },
        { x: stemLeft, y: bottom },
        { x: stemLeft, y: top + crossH },
        { x: left, y: top + crossH }
      ];
    default:
      return generateRectangularPoints(centerX, centerY, width, height);
  }
}

function generateCrossPoints(centerX: number, centerY: number, width: number, height: number): { x: number; y: number }[] {
  const armRatio = 0.3;
  const armW = width * armRatio;
  const armH = height * armRatio;
  
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;
  
  const armLeft = centerX - armW / 2;
  const armRight = centerX + armW / 2;
  const armTop = centerY - armH / 2;
  const armBottom = centerY + armH / 2;
  
  return [
    { x: armLeft, y: top },
    { x: armRight, y: top },
    { x: armRight, y: armTop },
    { x: right, y: armTop },
    { x: right, y: armBottom },
    { x: armRight, y: armBottom },
    { x: armRight, y: bottom },
    { x: armLeft, y: bottom },
    { x: armLeft, y: armBottom },
    { x: left, y: armBottom },
    { x: left, y: armTop },
    { x: armLeft, y: armTop }
  ];
}

// Create singleton instance
const serviceImpl = new RoomShapeServiceImpl();

// Initialize the plugin on service creation
serviceImpl.initialize().catch(err => 
  console.warn('Failed to initialize room shape plugin:', err)
);

export const roomShapeService: RoomShapeService = serviceImpl;