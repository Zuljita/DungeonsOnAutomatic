import RBush from 'rbush';

/**
 * Spatial indexing utility for efficient collision detection and spatial queries
 * 
 * This utility provides O(log n) spatial operations using R-tree indexing
 * instead of O(n) linear searches through arrays of spatial objects.
 * 
 * Use this for:
 * - Room collision detection during generation
 * - Path collision checking against rooms
 * - Any spatial queries involving bounding boxes
 */

export interface SpatialItem {
  /** Unique identifier for this spatial item */
  id: string;
  /** Left boundary (minimum x coordinate) */
  minX: number;
  /** Top boundary (minimum y coordinate) */
  minY: number;
  /** Right boundary (maximum x coordinate) */
  maxX: number;
  /** Bottom boundary (maximum y coordinate) */
  maxY: number;
  /** Optional data payload associated with this spatial item */
  data?: any;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * High-performance spatial index using R-tree data structure
 */
export class SpatialIndex {
  private tree: RBush<SpatialItem>;

  constructor() {
    this.tree = new RBush<SpatialItem>();
  }

  /**
   * Insert a spatial item into the index
   */
  insert(item: SpatialItem): void {
    this.tree.insert(item);
  }

  /**
   * Insert multiple spatial items into the index (bulk operation)
   * This is more efficient than multiple individual inserts
   */
  load(items: SpatialItem[]): void {
    this.tree.load(items);
  }

  /**
   * Remove a spatial item from the index
   */
  remove(item: SpatialItem): void {
    this.tree.remove(item);
  }

  /**
   * Clear all items from the index
   */
  clear(): void {
    this.tree.clear();
  }

  /**
   * Search for items that intersect with the given bounding box
   */
  search(bbox: SpatialItem): SpatialItem[] {
    return this.tree.search(bbox);
  }

  /**
   * Check if any items intersect with the given bounding box
   * This is more efficient than search() when you only need existence
   */
  intersects(bbox: SpatialItem): boolean {
    return this.tree.search(bbox).length > 0;
  }

  /**
   * Find all items that intersect with the given bounding box, excluding items with specified IDs
   */
  searchExcluding(bbox: SpatialItem, excludeIds: string[]): SpatialItem[] {
    const results = this.tree.search(bbox);
    return results.filter(item => !excludeIds.includes(item.id));
  }

  /**
   * Check if the given bounding box intersects with any existing items, 
   * excluding items with specified IDs
   */
  intersectsExcluding(bbox: SpatialItem, excludeIds: string[]): boolean {
    const results = this.tree.search(bbox);
    return results.some(item => !excludeIds.includes(item.id));
  }

  /**
   * Get all items in the index
   */
  all(): SpatialItem[] {
    return this.tree.all();
  }

  /**
   * Get the number of items in the index
   */
  size(): number {
    return this.tree.all().length;
  }
}

/**
 * Convert a bounding box to a spatial item for querying
 */
export function boundingBoxToSpatialItem(
  bbox: BoundingBox, 
  id: string = 'query', 
  data?: any
): SpatialItem {
  return {
    id,
    minX: bbox.x,
    minY: bbox.y,
    maxX: bbox.x + bbox.width,
    maxY: bbox.y + bbox.height,
    data
  };
}

/**
 * Convert a spatial item back to a bounding box
 */
export function spatialItemToBoundingBox(item: SpatialItem): BoundingBox {
  return {
    x: item.minX,
    y: item.minY,
    width: item.maxX - item.minX,
    height: item.maxY - item.minY
  };
}

/**
 * Create a spatial item from room coordinates with spacing
 */
export function roomToSpatialItem(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  spacing: number = 0,
  data?: any
): SpatialItem {
  return {
    id,
    minX: x - spacing,
    minY: y - spacing,
    maxX: x + width + spacing,
    maxY: y + height + spacing,
    data
  };
}

/**
 * Create a spatial item for a point with optional radius
 */
export function pointToSpatialItem(
  id: string,
  x: number,
  y: number,
  radius: number = 0,
  data?: any
): SpatialItem {
  return {
    id,
    minX: x - radius,
    minY: y - radius,
    maxX: x + radius,
    maxY: y + radius,
    data
  };
}

/**
 * Check if two spatial items overlap with custom spacing
 */
export function spatialItemsOverlap(
  a: SpatialItem,
  b: SpatialItem,
  spacing: number = 0
): boolean {
  return !(
    a.maxX + spacing <= b.minX ||
    b.maxX + spacing <= a.minX ||
    a.maxY + spacing <= b.minY ||
    b.maxY + spacing <= a.minY
  );
}

/**
 * Expand a spatial item by the given spacing in all directions
 */
export function expandSpatialItem(item: SpatialItem, spacing: number): SpatialItem {
  return {
    ...item,
    minX: item.minX - spacing,
    minY: item.minY - spacing,
    maxX: item.maxX + spacing,
    maxY: item.maxY + spacing
  };
}