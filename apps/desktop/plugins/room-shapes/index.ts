import type { RoomShape, RNG } from '../../core/types';
import type { RoomShapePlugin, ShapePreferences, PluginMetadata } from '../../core/plugin-types';

export const metadata: PluginMetadata = {
  id: 'room-shapes',
  version: '1.0.0',
  description: 'Room shape generation algorithms for Dungeons on Automatic',
  author: 'DOA Core',
  tags: ['room-shapes', 'generation', 'algorithms', 'core']
};

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

class RoomShapePluginImpl implements RoomShapePlugin {
  metadata = metadata;

  /**
   * Generate a room shape based on preferences and room kind
   */
  generateShape(preferences?: ShapePreferences, roomKind?: string, rng: RNG = Math.random): RoomShape {
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
    
    // Fallback
    return 'rectangular';
  }

  /**
   * Generate shape points for a given shape
   */
  generateShapePoints(shape: RoomShape, centerX: number, centerY: number, width: number, height: number, rng: RNG = Math.random): { x: number; y: number }[] {
    switch (shape) {
      case 'rectangular':
        return this.generateRectangularPoints(centerX, centerY, width, height);
      
      case 'circular':
        return this.generateCircularPoints(centerX, centerY, Math.min(width, height) / 2, rng);
      
      case 'hexagonal':
        return this.generateHexagonalPoints(centerX, centerY, Math.min(width, height) / 2);
      
      case 'octagonal':
        return this.generateOctagonalPoints(centerX, centerY, Math.min(width, height) / 2);
      
      case 'irregular':
        return this.generateIrregularPoints(centerX, centerY, width, height, rng);
      
      case 'L-shaped':
        return this.generateLShapedPoints(centerX, centerY, width, height, rng);
      
      case 'T-shaped':
        return this.generateTShapedPoints(centerX, centerY, width, height, rng);
      
      case 'cross':
        return this.generateCrossPoints(centerX, centerY, width, height);
      
      default:
        return this.generateRectangularPoints(centerX, centerY, width, height);
    }
  }

  /**
   * Get all supported room shapes
   */
  getSupportedShapes(): RoomShape[] {
    return ['rectangular', 'circular', 'hexagonal', 'octagonal', 'irregular', 'L-shaped', 'T-shaped', 'cross'];
  }

  /**
   * Get default shape preferences
   */
  getDefaultPreferences(): ShapePreferences {
    return { ...DEFAULT_PREFERENCES };
  }

  /**
   * Get preferences for a specific room kind
   */
  getKindPreferences(roomKind: string): Partial<ShapePreferences> {
    return KIND_PREFERENCES[roomKind] || {};
  }

  // Shape generation methods
  private generateRectangularPoints(centerX: number, centerY: number, width: number, height: number): { x: number; y: number }[] {
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

  private generateCircularPoints(centerX: number, centerY: number, radius: number, rng: RNG): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const numPoints = 16 + Math.floor(rng() * 8); // 16-24 points for smoother circle
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (2 * Math.PI * i) / numPoints;
      // Add slight radius variation for natural look
      const radiusVariation = 0.9 + rng() * 0.2; // 90%-110% of radius
      const actualRadius = radius * radiusVariation;
      
      const x = centerX + Math.cos(angle) * actualRadius;
      const y = centerY + Math.sin(angle) * actualRadius;
      points.push({ x: Math.round(x), y: Math.round(y) });
    }
    
    return points;
  }

  private generateHexagonalPoints(centerX: number, centerY: number, radius: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i; // 60 degrees between points
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      points.push({ x: Math.round(x), y: Math.round(y) });
    }
    
    return points;
  }

  private generateOctagonalPoints(centerX: number, centerY: number, radius: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i; // 45 degrees between points
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      points.push({ x: Math.round(x), y: Math.round(y) });
    }
    
    return points;
  }

  private generateIrregularPoints(centerX: number, centerY: number, width: number, height: number, rng: RNG): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const numPoints = 6 + Math.floor(rng() * 6); // 6-12 points
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (2 * Math.PI * i) / numPoints;
      
      // Irregular radius variation
      const radiusX = (width / 2) * (0.6 + rng() * 0.4); // 60%-100% of half-width
      const radiusY = (height / 2) * (0.6 + rng() * 0.4); // 60%-100% of half-height
      
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      points.push({ x: Math.round(x), y: Math.round(y) });
    }
    
    return points;
  }

  private generateLShapedPoints(centerX: number, centerY: number, width: number, height: number, rng: RNG): { x: number; y: number }[] {
    // Create L-shape by removing a corner from rectangle
    const orientation = Math.floor(rng() * 4); // 4 possible orientations
    const cutSize = 0.3 + rng() * 0.3; // Cut 30%-60% of the corner
    
    const left = centerX - width / 2;
    const right = centerX + width / 2;
    const top = centerY - height / 2;
    const bottom = centerY + height / 2;
    
    const cutW = width * cutSize;
    const cutH = height * cutSize;
    
    switch (orientation) {
      case 0: // Remove top-right corner
        return [
          { x: left, y: top },
          { x: right - cutW, y: top },
          { x: right - cutW, y: top + cutH },
          { x: right, y: top + cutH },
          { x: right, y: bottom },
          { x: left, y: bottom }
        ];
      case 1: // Remove top-left corner
        return [
          { x: left + cutW, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
          { x: left, y: top + cutH },
          { x: left + cutW, y: top + cutH }
        ];
      case 2: // Remove bottom-left corner
        return [
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left + cutW, y: bottom },
          { x: left + cutW, y: bottom - cutH },
          { x: left, y: bottom - cutH }
        ];
      default: // Remove bottom-right corner
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

  private generateTShapedPoints(centerX: number, centerY: number, width: number, height: number, rng: RNG): { x: number; y: number }[] {
    // Create T-shape with random orientation
    const orientation = Math.floor(rng() * 4); // 4 possible orientations
    const stemRatio = 0.3 + rng() * 0.2; // Stem width/height ratio
    
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
      case 1: // T pointing right
        const stemH = height * stemRatio;
        const stemTop = centerY - stemH / 2;
        const stemBottom = centerY + stemH / 2;
        const crossW = width * 0.4;
        return [
          { x: left, y: stemTop },
          { x: left + crossW, y: stemTop },
          { x: left + crossW, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left + crossW, y: bottom },
          { x: left + crossW, y: stemBottom },
          { x: left, y: stemBottom }
        ];
      case 2: // T pointing down  
        const stemW2 = width * stemRatio;
        const stemLeft2 = centerX - stemW2 / 2;
        const stemRight2 = centerX + stemW2 / 2;
        const crossH2 = height * 0.4;
        return [
          { x: stemLeft2, y: top },
          { x: stemRight2, y: top },
          { x: stemRight2, y: bottom - crossH2 },
          { x: right, y: bottom - crossH2 },
          { x: right, y: bottom },
          { x: left, y: bottom },
          { x: left, y: bottom - crossH2 },
          { x: stemLeft2, y: bottom - crossH2 }
        ];
      default: // T pointing left
        const stemH3 = height * stemRatio;
        const stemTop3 = centerY - stemH3 / 2;
        const stemBottom3 = centerY + stemH3 / 2;
        const crossW3 = width * 0.4;
        return [
          { x: left, y: top },
          { x: right - crossW3, y: top },
          { x: right - crossW3, y: stemTop3 },
          { x: right, y: stemTop3 },
          { x: right, y: stemBottom3 },
          { x: right - crossW3, y: stemBottom3 },
          { x: right - crossW3, y: bottom },
          { x: left, y: bottom }
        ];
    }
  }

  private generateCrossPoints(centerX: number, centerY: number, width: number, height: number): { x: number; y: number }[] {
    // Create cross shape with equal arm lengths
    const armRatio = 0.3; // Arms are 30% of total width/height
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
      // Starting from top-left of vertical arm, going clockwise
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

  // Plugin lifecycle methods
  initialize() {
    // No initialization needed for room shapes
  }

  cleanup() {
    // No cleanup needed for room shapes
  }

  getDefaultConfig() {
    return {
      defaultPreferences: DEFAULT_PREFERENCES,
      kindPreferences: KIND_PREFERENCES
    };
  }
}

export const roomShapePlugin: RoomShapePlugin = new RoomShapePluginImpl();

export default roomShapePlugin;