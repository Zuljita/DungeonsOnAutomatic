/**
 * Geometry utility for high-performance geometric operations
 * 
 * This module provides optimized geometric calculations that replace
 * custom distance calculations and line-segment operations throughout
 * the codebase.
 * 
 * Benefits:
 * - Centralized geometric operations
 * - Consistent precision handling
 * - Well-tested algorithms
 * - Reduced code duplication
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Calculate Euclidean distance between two points
 * 
 * Optimized implementation using hypot for better numerical stability
 */
export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

/**
 * Calculate the shortest distance from a point to a line segment
 * 
 * Uses optimized point-to-line-segment projection algorithm
 */
export function distanceFromPointToLineSegment(
  targetPoint: Point2D, 
  segmentStart: Point2D, 
  segmentEnd: Point2D
): number {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0) {
    // segmentStart and segmentEnd are the same point
    return distance(targetPoint, segmentStart);
  }
  
  // Calculate the parameter t for the closest point on the line
  let t = ((targetPoint.x - segmentStart.x) * dx + (targetPoint.y - segmentStart.y) * dy) / lengthSquared;
  
  // Clamp t to the line segment [0, 1]
  t = Math.max(0, Math.min(1, t));
  
  // Calculate the closest point on the line segment
  const closestPoint = {
    x: segmentStart.x + t * dx,
    y: segmentStart.y + t * dy
  };
  
  // Return distance from target point to closest point on segment
  return distance(targetPoint, closestPoint);
}

/**
 * Find the closest point on a line segment to a given point
 * 
 * Uses optimized projection algorithm for point-to-line-segment projection
 */
export function getClosestPointOnLineSegment(
  segmentStart: Point2D,
  segmentEnd: Point2D,
  targetPoint: Point2D
): Point2D {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0) {
    // segmentStart and segmentEnd are the same point
    return { x: segmentStart.x, y: segmentStart.y };
  }
  
  // Calculate the parameter t for the closest point on the line
  let t = ((targetPoint.x - segmentStart.x) * dx + (targetPoint.y - segmentStart.y) * dy) / lengthSquared;
  
  // Clamp t to the line segment [0, 1]
  t = Math.max(0, Math.min(1, t));
  
  // Return the closest point on the line segment
  return {
    x: segmentStart.x + t * dx,
    y: segmentStart.y + t * dy
  };
}

/**
 * Check if a point lies on a line segment within tolerance
 * 
 * Replaces custom point-on-line-segment checking with precise flatten-js operations
 */
export function isPointOnLineSegment(
  targetPoint: Point2D,
  segmentStart: Point2D,
  segmentEnd: Point2D,
  tolerance: number = 0.5
): boolean {
  const distance = distanceFromPointToLineSegment(targetPoint, segmentStart, segmentEnd);
  return distance <= tolerance;
}

/**
 * Check if a point is on a line segment using the sum-of-distances method
 * 
 * This is the legacy algorithm that some parts of the codebase may still rely on.
 * Uses flatten-js for the individual distance calculations.
 */
export function isPointOnLineSegmentLegacy(
  targetPoint: Point2D,
  segmentStart: Point2D,
  segmentEnd: Point2D,
  tolerance: number = 0.5
): boolean {
  const d1 = distance(targetPoint, segmentStart);
  const d2 = distance(targetPoint, segmentEnd);
  const lineLength = distance(segmentStart, segmentEnd);
  
  // Check if the point is approximately on the line segment using sum of distances
  return Math.abs(d1 + d2 - lineLength) < tolerance;
}

/**
 * Calculate the length of a line segment
 */
export function segmentLength(segmentStart: Point2D, segmentEnd: Point2D): number {
  return distance(segmentStart, segmentEnd);
}

/**
 * Get the edge vector of a line segment (normalized direction vector)
 */
export function getEdgeVector(segmentStart: Point2D, segmentEnd: Point2D): Point2D {
  const length = segmentLength(segmentStart, segmentEnd);
  
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: (segmentEnd.x - segmentStart.x) / length,
    y: (segmentEnd.y - segmentStart.y) / length
  };
}

/**
 * Check if two line segments intersect
 * 
 * Uses the oriented cross product method for line segment intersection
 */
export function doSegmentsIntersect(
  seg1Start: Point2D,
  seg1End: Point2D,
  seg2Start: Point2D,
  seg2End: Point2D
): boolean {
  // Helper function to compute the orientation of the ordered triplet (p, q, r)
  const orientation = (p: Point2D, q: Point2D, r: Point2D): number => {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0; // collinear
    return val > 0 ? 1 : 2; // clockwise or counterclockwise
  };
  
  // Helper function to check if point q lies on line segment pr
  const onSegment = (p: Point2D, q: Point2D, r: Point2D): boolean => {
    return (
      q.x <= Math.max(p.x, r.x) &&
      q.x >= Math.min(p.x, r.x) &&
      q.y <= Math.max(p.y, r.y) &&
      q.y >= Math.min(p.y, r.y)
    );
  };
  
  const o1 = orientation(seg1Start, seg1End, seg2Start);
  const o2 = orientation(seg1Start, seg1End, seg2End);
  const o3 = orientation(seg2Start, seg2End, seg1Start);
  const o4 = orientation(seg2Start, seg2End, seg1End);
  
  // General case
  if (o1 !== o2 && o3 !== o4) return true;
  
  // Special cases - collinear points
  if (o1 === 0 && onSegment(seg1Start, seg2Start, seg1End)) return true;
  if (o2 === 0 && onSegment(seg1Start, seg2End, seg1End)) return true;
  if (o3 === 0 && onSegment(seg2Start, seg1Start, seg2End)) return true;
  if (o4 === 0 && onSegment(seg2Start, seg1End, seg2End)) return true;
  
  return false;
}

/**
 * Calculate bounding box for a set of points
 */
export function getBoundingBox(points: Point2D[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}

/**
 * Linear interpolation between two points
 */
export function lerp(start: Point2D, end: Point2D, t: number): Point2D {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t
  };
}

/**
 * Generate points along a line segment
 * 
 * Useful for rasterizing line segments for ASCII/grid-based rendering
 */
export function getLinePoints(start: Point2D, end: Point2D, steps?: number): Point2D[] {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const calculatedSteps = steps || Math.max(dx, dy);
  
  if (calculatedSteps === 0) {
    return [start];
  }
  
  const points: Point2D[] = [];
  for (let i = 0; i <= calculatedSteps; i++) {
    const t = i / calculatedSteps;
    const x = Math.round(start.x + (end.x - start.x) * t);
    const y = Math.round(start.y + (end.y - start.y) * t);
    points.push({ x, y });
  }
  
  return points;
}