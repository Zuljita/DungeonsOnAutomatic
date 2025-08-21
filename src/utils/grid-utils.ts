/**
 * Grid utility functions for dungeon rendering and processing
 * Consolidates duplicate grid operations found across multiple files
 */

export interface GridBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Calculate grid bounds from an array of points
 * Consolidates duplicate bounds calculation logic found in 7+ files
 */
export function calculateGridBounds(points: Point[], padding: number = 1): GridBounds {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
  }

  const minX = Math.min(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxX = Math.max(...points.map(p => p.x)) + padding;
  const maxY = Math.max(...points.map(p => p.y)) + padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Create a 2D grid filled with a specified character
 * Consolidates duplicate grid initialization logic found in 5+ files
 */
export function createGrid<T>(width: number, height: number, fillValue: T): T[][] {
  return Array.from({ length: height }, () => Array(width).fill(fillValue));
}

/**
 * Create a grid from points with automatic bounds calculation and coordinate transformation
 */
export function createGridFromPoints<T>(points: Point[], fillValue: T, padding: number = 1): {
  grid: T[][];
  bounds: GridBounds;
  transform: (x: number, y: number) => { x: number; y: number };
} {
  const bounds = calculateGridBounds(points, padding);
  const grid = createGrid(bounds.width, bounds.height, fillValue);
  
  // Transform world coordinates to grid coordinates
  const transform = (x: number, y: number) => ({
    x: x - bounds.minX,
    y: y - bounds.minY
  });
  
  return { grid, bounds, transform };
}

/**
 * Check if coordinates are within grid bounds
 */
export function isInBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

/**
 * Get all points within a rectangular area
 */
export function getPointsInRectangle(x: number, y: number, width: number, height: number): Point[] {
  const points: Point[] = [];
  for (let py = y; py < y + height; py++) {
    for (let px = x; px < x + width; px++) {
      points.push({ x: px, y: py });
    }
  }
  return points;
}

/**
 * Convert grid to string representation (useful for ASCII rendering)
 */
export function gridToString(grid: string[][], rowSeparator: string = '\n'): string {
  return grid.map(row => row.join('')).join(rowSeparator);
}