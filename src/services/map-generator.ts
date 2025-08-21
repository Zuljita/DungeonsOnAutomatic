import { Dungeon, Room, Corridor, Door, RoomShape } from '../core/types';
import { rng, id } from './random';
import Delaunator from 'delaunator';
import { generateDoor } from './doors';
import { roomShapeService, ShapePreferences } from './room-shapes';
import { connectRooms, type EnhancedPathfindingOptions } from './corridors';
import { createSimpleUnionFind } from '../utils/union-find';
import { SpatialIndex, roomToSpatialItem, spatialItemsOverlap, pointToSpatialItem } from '../utils/spatial-index';

// A* pathfinding node for corridor generation
interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total cost (g + h)
  parent?: PathNode;
}

// Priority queue for A* pathfinding
class PriorityQueue {
  private items: PathNode[] = [];

  enqueue(node: PathNode): void {
    this.items.push(node);
    this.items.sort((a, b) => a.f - b.f);
  }

  dequeue(): PathNode | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export interface MapGenerationOptions {
  // Layout Types
  layoutType: 'rectangle' | 'square' | 'box' | 'cross' | 'dagger' | 'saltire' | 'keep' | 'hexagon' | 'round' | 'cavernous';
  
  // Room Configuration
  roomLayout: 'sparse' | 'scattered' | 'dense' | 'symmetric';
  roomSize: 'small' | 'medium' | 'large' | 'mixed';
  roomShape: 'rectangular' | 'round' | 'hexagonal' | 'mixed' | 'diverse' | 'small-preference' | 'hex-preference' | 'circular-preference';
  
  // Corridor Configuration
  corridorType: 'maze' | 'winding' | 'straight' | 'mixed';
  pathfindingAlgorithm?: 'manhattan' | 'astar' | 'jumppoint' | 'dijkstra';
  corridorWidth: 1 | 2 | 3; // Width in tiles for battle map compatibility
  allowDeadends: boolean;
  
  // Special Features
  stairsUp: boolean;
  stairsDown: boolean;
  entranceFromPeriphery: boolean;
  
  // Basic Parameters
  rooms: number;
  width: number;
  height: number;
  seed?: string;
}

export interface LayoutBoundary {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'room' | 'corridor' | 'special';
}

/**
 * Comprehensive map generation service with multiple layout types and configurations
 */
export class MapGenerator {
  private R: () => number;

  constructor(seed?: string) {
    this.R = rng(seed || Math.random().toString(36).slice(2, 10));
  }

  /**
   * Generate a dungeon with the specified options
   */
  public generateDungeon(options: MapGenerationOptions): Dungeon {
    // Reinitialize RNG so each generation with the same seed is deterministic
    const seed = options.seed ?? this.R().toString(36).slice(2, 10);
    this.R = rng(seed);

    const { rooms, width, height, layoutType, roomLayout, roomSize, roomShape, corridorType, pathfindingAlgorithm = 'manhattan', corridorWidth, allowDeadends, stairsUp, stairsDown, entranceFromPeriphery } = options;

    // Generate layout boundaries based on type
    const boundaries = this.generateLayoutBoundaries(layoutType, width, height);
    
    // Generate rooms based on layout and configuration
    const roomBoundaries = this.generateRoomBoundaries(boundaries, rooms, roomLayout, roomSize, roomShape);
    
    // Ensure we have at least one room boundary
    if (roomBoundaries.length === 0) {
      throw new Error(`Failed to generate any room boundaries for layout: ${roomLayout}`);
    }
    
    // Convert boundaries to actual rooms
    const dungeonRooms = this.createRooms(roomBoundaries, roomShape);
    
    // Add special features BEFORE corridor generation so they get connected
    const specialRooms = this.addSpecialFeatures(dungeonRooms, boundaries, stairsUp, stairsDown, entranceFromPeriphery);
    
    // Combine all rooms for corridor generation
    const allRooms = [...dungeonRooms, ...specialRooms];
    
    // Generate corridors based on type (including special rooms)
    const corridors = this.generateCorridors(allRooms, corridorType, pathfindingAlgorithm, corridorWidth, allowDeadends, width, height);
    
    // Generate doors
    const doors = this.generateDoors(corridors);
    
    return {
      seed,
      rooms: allRooms,
      corridors,
      doors,
      rng: this.R
    };
  }

  /**
   * Generate layout boundaries based on the selected type
   */
  private generateLayoutBoundaries(layoutType: string, width: number, height: number): LayoutBoundary[] {
    const boundaries: LayoutBoundary[] = [];
    const margin = Math.min(width, height) * 0.1;

    switch (layoutType) {
      case 'rectangle':
        boundaries.push({
          x: margin,
          y: margin,
          width: width - 2 * margin,
          height: height - 2 * margin,
          type: 'room'
        });
        break;

      case 'square':
        const size = Math.min(width, height) - 2 * margin;
        const offsetX = (width - size) / 2;
        const offsetY = (height - size) / 2;
        boundaries.push({
          x: offsetX,
          y: offsetY,
          width: size,
          height: size,
          type: 'room'
        });
        break;

      case 'box':
        // Outer boundary with inner courtyard
        const outerMargin = margin * 2;
        boundaries.push(
          { x: margin, y: margin, width: width - 2 * margin, height: margin * 3, type: 'room' }, // Top
          { x: margin, y: height - margin * 4, width: width - 2 * margin, height: margin * 3, type: 'room' }, // Bottom
          { x: margin, y: margin * 4, width: margin * 3, height: height - 8 * margin, type: 'room' }, // Left
          { x: width - margin * 4, y: margin * 4, width: margin * 3, height: height - 8 * margin, type: 'room' } // Right
        );
        break;

      case 'cross':
        const crossWidth = width * 0.3;
        const crossHeight = height * 0.3;
        const crossCenterX = (width - crossWidth) / 2;
        const crossCenterY = (height - crossHeight) / 2;
        boundaries.push(
          { x: crossCenterX, y: margin, width: crossWidth, height: crossCenterY - margin, type: 'room' }, // Top
          { x: crossCenterX, y: crossCenterY + crossHeight, width: crossWidth, height: crossCenterY - margin, type: 'room' }, // Bottom
          { x: margin, y: crossCenterY, width: crossCenterX - margin, height: crossHeight, type: 'room' }, // Left
          { x: crossCenterX + crossWidth, y: crossCenterY, width: crossCenterX - margin, height: crossHeight, type: 'room' } // Right
        );
        break;

      case 'dagger':
        const daggerWidth = width * 0.4;
        const daggerHeight = height * 0.6;
        const daggerX = (width - daggerWidth) / 2;
        boundaries.push(
          { x: daggerX, y: margin, width: daggerWidth, height: daggerHeight, type: 'room' }, // Blade
          { x: daggerX - daggerWidth * 0.3, y: daggerHeight + margin, width: daggerWidth * 1.6, height: daggerHeight * 0.3, type: 'room' } // Handle
        );
        break;

      case 'saltire':
        const saltireWidth = width * 0.2;
        const saltireHeight = height * 0.2;
        boundaries.push(
          { x: margin, y: margin, width: saltireWidth, height: saltireHeight, type: 'room' }, // Top-left
          { x: width - margin - saltireWidth, y: margin, width: saltireWidth, height: saltireHeight, type: 'room' }, // Top-right
          { x: margin, y: height - margin - saltireHeight, width: saltireWidth, height: saltireHeight, type: 'room' }, // Bottom-left
          { x: width - margin - saltireWidth, y: height - margin - saltireHeight, width: saltireWidth, height: saltireHeight, type: 'room' } // Bottom-right
        );
        break;

      case 'keep':
        const keepSize = Math.min(width, height) * 0.7;
        const keepX = (width - keepSize) / 2;
        const keepY = (height - keepSize) / 2;
        const towerSize = keepSize * 0.2;
        boundaries.push(
          { x: keepX, y: keepY, width: keepSize, height: keepSize, type: 'room' }, // Main keep
          { x: keepX - towerSize, y: keepY - towerSize, width: towerSize, height: towerSize, type: 'room' }, // Top-left tower
          { x: keepX + keepSize, y: keepY - towerSize, width: towerSize, height: towerSize, type: 'room' }, // Top-right tower
          { x: keepX - towerSize, y: keepY + keepSize, width: towerSize, height: towerSize, type: 'room' }, // Bottom-left tower
          { x: keepX + keepSize, y: keepY + keepSize, width: towerSize, height: towerSize, type: 'room' } // Bottom-right tower
        );
        break;

      case 'hexagon':
        // Approximate hexagon with rectangles
        const hexSize = Math.min(width, height) * 0.4;
        const hexX = (width - hexSize) / 2;
        const hexY = (height - hexSize) / 2;
        boundaries.push(
          { x: hexX + hexSize * 0.25, y: hexY, width: hexSize * 0.5, height: hexSize * 0.3, type: 'room' }, // Top
          { x: hexX + hexSize * 0.25, y: hexY + hexSize * 0.7, width: hexSize * 0.5, height: hexSize * 0.3, type: 'room' }, // Bottom
          { x: hexX, y: hexY + hexSize * 0.2, width: hexSize * 0.3, height: hexSize * 0.6, type: 'room' }, // Left
          { x: hexX + hexSize * 0.7, y: hexY + hexSize * 0.2, width: hexSize * 0.3, height: hexSize * 0.6, type: 'room' }, // Right
          { x: hexX + hexSize * 0.2, y: hexY + hexSize * 0.35, width: hexSize * 0.6, height: hexSize * 0.3, type: 'room' } // Center
        );
        break;

      case 'round':
        // Approximate circle with overlapping rectangles
        const radius = Math.min(width, height) * 0.35;
        const roundCenterX = width / 2;
        const roundCenterY = height / 2;
        const segmentSize = radius * 0.4;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          const x = roundCenterX + Math.cos(angle) * radius - segmentSize / 2;
          const y = roundCenterY + Math.sin(angle) * radius - segmentSize / 2;
          boundaries.push({
            x: Math.max(margin, x),
            y: Math.max(margin, y),
            width: segmentSize,
            height: segmentSize,
            type: 'room'
          });
        }
        break;

      case 'cavernous':
        // Irregular cavern-like boundaries
        const cavernCount = Math.floor(this.R() * 5) + 3;
        for (let i = 0; i < cavernCount; i++) {
          const size = (Math.min(width, height) * 0.3) + (this.R() * Math.min(width, height) * 0.2);
          boundaries.push({
            x: margin + this.R() * (width - 2 * margin - size),
            y: margin + this.R() * (height - 2 * margin - size),
            width: size,
            height: size,
            type: 'room'
          });
        }
        break;

      default:
        boundaries.push({
          x: margin,
          y: margin,
          width: width - 2 * margin,
          height: height - 2 * margin,
          type: 'room'
        });
    }

    return boundaries;
  }

  /**
   * Generate room boundaries based on layout and configuration
   * Uses spatial indexing for optimal collision detection performance
   */
  private generateRoomBoundaries(
    boundaries: LayoutBoundary[],
    roomCount: number,
    layout: string,
    size: string,
    shape: string
  ): LayoutBoundary[] {
    const roomBoundaries: LayoutBoundary[] = [];
    const spatialIndex = new SpatialIndex(); // O(log n) collision detection
    const maxAttempts = roomCount * 50; // Same as rooms.ts
    let attempts = 0;

    const getMinSpacing = (layout: string): number => {
      switch (layout) {
        case 'sparse': return 4; // Wider spacing for sparse layouts
        case 'scattered': return 2; // Standard spacing
        case 'dense': return 1; // Minimal spacing for dense layouts
        case 'symmetric': return 3; // Clean spacing for symmetrical layouts
        default: return 2;
      }
    };

    const addRoomWithOverlapCheck = (candidateRoom: LayoutBoundary): boolean => {
      // Check if room fits within any boundary
      const fitsInBoundary = boundaries.some(boundary => 
        candidateRoom.x >= boundary.x &&
        candidateRoom.y >= boundary.y &&
        candidateRoom.x + candidateRoom.width <= boundary.x + boundary.width &&
        candidateRoom.y + candidateRoom.height <= boundary.y + boundary.height
      );

      if (!fitsInBoundary) return false;

      // Use spatial index for O(log n) collision detection instead of O(n) linear search
      const spacing = getMinSpacing(layout);
      const candidateSpatialItem = roomToSpatialItem(
        `candidate-${attempts}`,
        candidateRoom.x,
        candidateRoom.y,
        candidateRoom.width,
        candidateRoom.height,
        spacing
      );

      // Check for overlaps using spatial index - much faster than linear search
      if (spatialIndex.intersects(candidateSpatialItem)) {
        return false;
      }

      // Add room to both arrays and spatial index
      roomBoundaries.push(candidateRoom);
      const roomSpatialItem = roomToSpatialItem(
        `room-${roomBoundaries.length}`,
        candidateRoom.x,
        candidateRoom.y,
        candidateRoom.width,
        candidateRoom.height,
        0, // Don't double-apply spacing when adding to index
        candidateRoom
      );
      spatialIndex.insert(roomSpatialItem);
      
      return true;
    };

    switch (layout) {
      case 'sparse':
        // Fewer, larger rooms spread out
        const sparseCount = Math.floor(roomCount * 0.6);
        while (roomBoundaries.length < sparseCount && attempts < maxAttempts) {
          attempts++;
          const boundary = this.selectRandomBoundary(boundaries);
          const roomSize = this.getRoomSize(size, 'large');
          const maxX = Math.max(0, boundary.width - roomSize.width);
          const maxY = Math.max(0, boundary.height - roomSize.height);
          
          const candidateRoom: LayoutBoundary = {
            x: boundary.x + this.R() * maxX,
            y: boundary.y + this.R() * maxY,
            width: roomSize.width,
            height: roomSize.height,
            type: 'room'
          };
          
          addRoomWithOverlapCheck(candidateRoom);
        }
        break;

      case 'scattered':
        // Random placement within boundaries
        while (roomBoundaries.length < roomCount && attempts < maxAttempts) {
          attempts++;
          const boundary = this.selectRandomBoundary(boundaries);
          const roomSize = this.getRoomSize(size, 'mixed');
          const maxX = Math.max(0, boundary.width - roomSize.width);
          const maxY = Math.max(0, boundary.height - roomSize.height);
          
          const candidateRoom: LayoutBoundary = {
            x: boundary.x + this.R() * maxX,
            y: boundary.y + this.R() * maxY,
            width: roomSize.width,
            height: roomSize.height,
            type: 'room'
          };
          
          addRoomWithOverlapCheck(candidateRoom);
        }
        break;

      case 'dense':
        // Many smaller rooms packed together
        const denseCount = Math.floor(roomCount * 1.5);
        while (roomBoundaries.length < denseCount && attempts < maxAttempts) {
          attempts++;
          const boundary = this.selectRandomBoundary(boundaries);
          const roomSize = this.getRoomSize(size, 'small');
          const maxX = Math.max(0, boundary.width - roomSize.width);
          const maxY = Math.max(0, boundary.height - roomSize.height);
          
          const candidateRoom: LayoutBoundary = {
            x: boundary.x + this.R() * maxX,
            y: boundary.y + this.R() * maxY,
            width: roomSize.width,
            height: roomSize.height,
            type: 'room'
          };
          
          addRoomWithOverlapCheck(candidateRoom);
        }
        break;

      case 'symmetric':
        // Symmetrical placement
        const symmetricCount = Math.floor(roomCount / 2) * 2; // Ensure even number
        while (roomBoundaries.length < symmetricCount && attempts < maxAttempts) {
          attempts += 2; // We're placing two rooms per iteration
          const boundary = this.selectRandomBoundary(boundaries);
          const roomSize = this.getRoomSize(size, 'medium');
          const centerX = boundary.x + boundary.width / 2;
          const centerY = boundary.y + boundary.height / 2;
          
          // Place two rooms symmetrically
          const offsetX = (this.R() - 0.5) * boundary.width * 0.3;
          const offsetY = (this.R() - 0.5) * boundary.height * 0.3;
          
          const room1: LayoutBoundary = {
            x: centerX + offsetX - roomSize.width / 2,
            y: centerY + offsetY - roomSize.height / 2,
            width: roomSize.width,
            height: roomSize.height,
            type: 'room'
          };
          
          const room2: LayoutBoundary = {
            x: centerX - offsetX - roomSize.width / 2,
            y: centerY - offsetY - roomSize.height / 2,
            width: roomSize.width,
            height: roomSize.height,
            type: 'room'
          };
          
          // Check if both rooms can be added without overlap (don't add either if one fails)
          const room1FitsInBoundary = boundaries.some(boundary => 
            room1.x >= boundary.x &&
            room1.y >= boundary.y &&
            room1.x + room1.width <= boundary.x + boundary.width &&
            room1.y + room1.height <= boundary.y + boundary.height
          );
          const room2FitsInBoundary = boundaries.some(boundary => 
            room2.x >= boundary.x &&
            room2.y >= boundary.y &&
            room2.x + room2.width <= boundary.x + boundary.width &&
            room2.y + room2.height <= boundary.y + boundary.height
          );
          
          // Use spatial index for O(log n) collision detection for both rooms
          const spacing = getMinSpacing(layout);
          const room1SpatialItem = roomToSpatialItem(
            `room1-candidate-${attempts}`,
            room1.x,
            room1.y,
            room1.width,
            room1.height,
            spacing
          );
          const room2SpatialItem = roomToSpatialItem(
            `room2-candidate-${attempts}`,
            room2.x,
            room2.y,
            room2.width,
            room2.height,
            spacing
          );
          
          const room1NoOverlap = !spatialIndex.intersects(room1SpatialItem);
          const room2NoOverlap = !spatialIndex.intersects(room2SpatialItem);
          
          const room1Fits = room1FitsInBoundary && room1NoOverlap;
          const room2Fits = room2FitsInBoundary && room2NoOverlap;
          
          // Only add both if both fit, ensuring symmetry
          if (room1Fits && room2Fits) {
            roomBoundaries.push(room1);
            roomBoundaries.push(room2);
            
            // Add both rooms to spatial index for future collision checks
            const room1IndexItem = roomToSpatialItem(
              `room-${roomBoundaries.length - 1}`,
              room1.x,
              room1.y,
              room1.width,
              room1.height,
              0,
              room1
            );
            const room2IndexItem = roomToSpatialItem(
              `room-${roomBoundaries.length}`,
              room2.x,
              room2.y,
              room2.width,
              room2.height,
              0,
              room2
            );
            spatialIndex.insert(room1IndexItem);
            spatialIndex.insert(room2IndexItem);
          }
        }
        break;
    }

    return roomBoundaries;
  }

  /**
   * Get room size based on configuration
   */
  private getRoomSize(size: string, fallback: string): { width: number; height: number } {
    const actualSize = size === 'mixed' ? fallback : size;
    
    switch (actualSize) {
      case 'small':
        return { width: 3 + Math.floor(this.R() * 3), height: 3 + Math.floor(this.R() * 3) };
      case 'medium':
        return { width: 5 + Math.floor(this.R() * 4), height: 5 + Math.floor(this.R() * 4) };
      case 'large':
        return { width: 8 + Math.floor(this.R() * 6), height: 8 + Math.floor(this.R() * 6) };
      default:
        return { width: 5 + Math.floor(this.R() * 4), height: 5 + Math.floor(this.R() * 4) };
    }
  }

  /**
   * Select a random boundary from the available ones
   */
  private selectRandomBoundary(boundaries: LayoutBoundary[]): LayoutBoundary {
    if (!boundaries || boundaries.length === 0) {
      throw new Error('No boundaries available for room placement');
    }
    return boundaries[Math.floor(this.R() * boundaries.length)];
  }

  /**
   * Create actual rooms from boundaries
   */
  private createRooms(boundaries: LayoutBoundary[], shapePreference: string): Room[] {
    return boundaries.map((boundary, index) => {
      return this.createRoom(boundary, shapePreference, index);
    });
  }

  /**
   * Create a single room with the specified shape preference
   */
  private createRoom(boundary: LayoutBoundary, shapePreference: string, index: number): Room {
    const roomId = `room-${index}`;
    
    // Get shape preferences based on configuration
    const shapePrefs = this.getShapePreferences(shapePreference);
    
    // Generate a room shape based on preferences
    const roomShape = roomShapeService.generateRoomShape(shapePrefs, 'chamber', this.R);
    
    // Calculate center point for the boundary
    const centerX = Math.floor(boundary.x + boundary.width / 2);
    const centerY = Math.floor(boundary.y + boundary.height / 2);
    const width = Math.floor(boundary.width);
    const height = Math.floor(boundary.height);
    
    // Generate shape points if needed
    let shapePoints: { x: number; y: number }[] | undefined;
    if (roomShape !== 'rectangular') {
      shapePoints = roomShapeService.generateShapePoints(
        roomShape, 
        centerX, 
        centerY, 
        width, 
        height, 
        this.R
      );
    }
    
    // For rectangular rooms, use top-left coordinates
    const x = roomShape === 'rectangular' ? Math.floor(boundary.x) : centerX;
    const y = roomShape === 'rectangular' ? Math.floor(boundary.y) : centerY;
    
    return {
      id: roomId,
      kind: 'chamber',
      x,
      y,
      w: width,
      h: height,
      shape: roomShape,
      shapePoints,
      tags: [roomShape, 'chamber']
    };
  }

  /**
   * Get shape preferences based on user selection
   */
  private getShapePreferences(shapePreference: string): ShapePreferences {
    switch (shapePreference) {
      case 'diverse':
        // Equal weight to all shapes for maximum variety
        return {
          rectangular: 12,
          circular: 12,
          hexagonal: 12,
          octagonal: 12,
          irregular: 12,
          'L-shaped': 12,
          'T-shaped': 12,
          cross: 12
        };
      
      case 'small-preference':
        // Preference for smaller, more complex shapes
        return {
          rectangular: 10,
          circular: 15,
          hexagonal: 15,
          octagonal: 15,
          irregular: 8,
          'L-shaped': 12,
          'T-shaped': 12,
          cross: 8
        };
      
      case 'hex-preference':
        // Preference for hexagonal and geometric shapes
        return {
          rectangular: 15,
          circular: 8,
          hexagonal: 25,
          octagonal: 20,
          irregular: 5,
          'L-shaped': 10,
          'T-shaped': 10,
          cross: 7
        };
      
      case 'circular-preference':
        // Preference for round and natural shapes
        return {
          rectangular: 12,
          circular: 25,
          hexagonal: 8,
          octagonal: 15,
          irregular: 20,
          'L-shaped': 8,
          'T-shaped': 8,
          cross: 4
        };
      
      case 'mixed':
        // Balanced mix with slight rectangular preference
        return {
          rectangular: 20,
          circular: 15,
          hexagonal: 15,
          octagonal: 12,
          irregular: 12,
          'L-shaped': 10,
          'T-shaped': 10,
          cross: 6
        };
      
      case 'rectangular':
        // Primarily rectangular with occasional variety
        return {
          rectangular: 70,
          circular: 5,
          hexagonal: 8,
          octagonal: 7,
          irregular: 3,
          'L-shaped': 4,
          'T-shaped': 2,
          cross: 1
        };
      
      case 'round':
        // Primarily circular with natural variations
        return {
          rectangular: 10,
          circular: 50,
          hexagonal: 5,
          octagonal: 10,
          irregular: 20,
          'L-shaped': 3,
          'T-shaped': 1,
          cross: 1
        };
      
      case 'hexagonal':
        // Primarily hexagonal with geometric variations
        return {
          rectangular: 15,
          circular: 5,
          hexagonal: 50,
          octagonal: 20,
          irregular: 3,
          'L-shaped': 4,
          'T-shaped': 2,
          cross: 1
        };
      
      default:
        // Default to balanced variety
        return {
          rectangular: 25,
          circular: 15,
          hexagonal: 15,
          octagonal: 12,
          irregular: 12,
          'L-shaped': 10,
          'T-shaped': 8,
          cross: 3
        };
    }
  }

  /**
   * Get a random room shape
   */
  private getRandomShape(): string {
    const shapes = ['rectangular', 'round', 'hexagonal'];
    return shapes[Math.floor(this.R() * shapes.length)];
  }

  /**
   * Generate corridors using graph algorithms
   */
  private generateCorridors(rooms: Room[], type: string, pathfindingAlgorithm: string, width: number, allowDeadends: boolean, mapWidth: number, mapHeight: number): Corridor[] {
    // Build room graph with deadend handling
    const roomConnections = this.buildRoomGraph(rooms, allowDeadends);
    
    // Use enhanced corridor generation based on pathfinding algorithm
    const useEnhanced = pathfindingAlgorithm !== 'manhattan';
    
    const pathfindingOptions: EnhancedPathfindingOptions = {
      algorithm: pathfindingAlgorithm as any,
      usePathfindingLib: useEnhanced
    };
    
    // Generate corridors using the room connections and unified pathfinding
    let corridors = this.connectRoomsWithGraph(rooms, roomConnections, pathfindingOptions);
    
    // Expand corridors to desired width for battle map compatibility if needed
    if (width > 1) {
      corridors = corridors.map(corridor => ({
        ...corridor,
        path: this.expandCorridorToWidth(corridor.path, width)
      }));
    }

    return corridors;
  }

  /**
   * Build a graph connecting rooms using Delaunay triangulation and MST
   */
  private buildRoomGraph(rooms: Room[], allowDeadends: boolean): Array<[number, number]> {
    if (rooms.length < 2) return [];

    const centers = rooms.map(r => [r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2)] as const);
    const delaunay = Delaunator.from(centers);
    const edgeMap = new Map<string, { a: number; b: number; d: number }>();

    const addEdge = (i: number, j: number): void => {
      if (i > j) [i, j] = [j, i];
      const key = `${i}-${j}`;
      if (!edgeMap.has(key)) {
        const dx = centers[i][0] - centers[j][0];
        const dy = centers[i][1] - centers[j][1];
        const d = Math.sqrt(dx * dx + dy * dy);
        edgeMap.set(key, { a: i, b: j, d });
      }
    };

    for (let t = 0; t < delaunay.triangles.length; t += 3) {
      const a = delaunay.triangles[t];
      const b = delaunay.triangles[t + 1];
      const c = delaunay.triangles[t + 2];
      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
    }

    // Ensure every room has at least one edge
    const used = new Set<number>();
    edgeMap.forEach((e) => {
      used.add(e.a);
      used.add(e.b);
    });
    for (let i = 0; i < rooms.length; i++) {
      if (!used.has(i)) {
        let best = -1;
        let bestD = Infinity;
        for (let j = 0; j < rooms.length; j++) {
          if (i === j) continue;
          const dx = centers[i][0] - centers[j][0];
          const dy = centers[i][1] - centers[j][1];
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestD) {
            bestD = d;
            best = j;
          }
        }
        if (best >= 0) addEdge(i, best);
      }
    }

    let edges = Array.from(edgeMap.values()).sort((e1, e2) => e1.d - e2.d);

    const buildMST = (edgesList: { a: number; b: number; d: number }[]) => {
      const unionFind = createSimpleUnionFind(rooms.length);
      const mstEdges: Array<[number, number]> = [];
      const extra: { a: number; b: number; d: number }[] = [];
      for (const e of edgesList) {
        if (!unionFind.connected(e.a, e.b)) {
          unionFind.union(e.a, e.b);
          mstEdges.push([e.a, e.b]);
        } else {
          extra.push(e);
        }
      }
      return { mstEdges, extra };
    };

    let { mstEdges: mst, extra: leftovers } = buildMST(edges);

    if (mst.length < rooms.length - 1) {
      const complete: { a: number; b: number; d: number }[] = [];
      for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
          const dx = centers[i][0] - centers[j][0];
          const dy = centers[i][1] - centers[j][1];
          const d = Math.sqrt(dx * dx + dy * dy);
          complete.push({ a: i, b: j, d });
        }
      }
      complete.sort((e1, e2) => e1.d - e2.d);
      const res = buildMST(complete);
      mst = res.mstEdges;
      leftovers = res.extra;
    }

    if (!allowDeadends && leftovers.length) {
      leftovers.forEach((e) => {
        if (this.R() < 0.3) mst.push([e.a, e.b]);
      });
      if (mst.length === rooms.length - 1) {
        const e = leftovers[Math.floor(this.R() * leftovers.length)];
        mst.push([e.a, e.b]);
      }
    }

    return mst;
  }

  /**
   * Connect rooms using pre-calculated room graph and pathfinding options
   */
  private connectRoomsWithGraph(rooms: Room[], connections: Array<[number, number]>, options: EnhancedPathfindingOptions): Corridor[] {
    const corridors: Corridor[] = [];
    
    for (const [a, b] of connections) {
      const roomA = rooms[a];
      const roomB = rooms[b];
      const from = roomA.id;
      const to = roomB.id;
      
      // Use enhanced pathfinding if available and enabled
      const useEnhanced = options.usePathfindingLib && options.algorithm !== 'manhattan';
      
      if (useEnhanced) {
        // Try enhanced door-to-door pathfinding
        const doorPoints = this.calculateDoorConnectionPoints(roomA, roomB);
        
        corridors.push({ 
          id: id('cor', this.R), 
          from, 
          to, 
          path: [doorPoints.start, doorPoints.end],
          doorStart: doorPoints.start,
          doorEnd: doorPoints.end
        });
      } else {
        // Use Manhattan pathfinding with trimming (classic behavior)
        const centerA = { x: roomA.x + Math.floor(roomA.w/2), y: roomA.y + Math.floor(roomA.h/2) };
        const centerB = { x: roomB.x + Math.floor(roomB.w/2), y: roomB.y + Math.floor(roomB.h/2) };
        
        let path = this.manhattanPath(centerA, centerB);
        path = this.trimPath(path, roomA, roomB);
        
        // Calculate door points for door placement
        const doorPoints = this.calculateDoorConnectionPoints(roomA, roomB);
        
        corridors.push({ 
          id: id('cor', this.R), 
          from, 
          to, 
          path,
          doorStart: doorPoints.start,
          doorEnd: doorPoints.end
        });
      }
    }
    
    return corridors;
  }

  /**
   * Calculate optimal door connection points between two rooms
   */
  private calculateDoorConnectionPoints(room1: Room, room2: Room): {
    start: { x: number; y: number };
    end: { x: number; y: number };
  } {
    const center1 = { x: room1.x + Math.floor(room1.w / 2), y: room1.y + Math.floor(room1.h / 2) };
    const center2 = { x: room2.x + Math.floor(room2.w / 2), y: room2.y + Math.floor(room2.h / 2) };
    
    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;
    
    let startDirection: 'top' | 'bottom' | 'left' | 'right';
    let endDirection: 'top' | 'bottom' | 'left' | 'right';
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        startDirection = 'right';
        endDirection = 'left';
      } else {
        startDirection = 'left';
        endDirection = 'right';
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        startDirection = 'bottom';
        endDirection = 'top';
      } else {
        startDirection = 'top';
        endDirection = 'bottom';
      }
    }
    
    const start = roomShapeService.findClosestEdgePoint(room1, startDirection, center2);
    const end = roomShapeService.findClosestEdgePoint(room2, endDirection, center1);
    
    return { start, end };
  }

  /**
   * Generate Manhattan path between two points
   */
  private manhattanPath(a: {x: number; y: number}, b: {x: number; y: number}): {x: number; y: number}[] {
    const path = [] as {x: number; y: number}[];
    const xStep = a.x < b.x ? 1 : -1;
    const yStep = a.y < b.y ? 1 : -1;
    
    // Randomize whether to move horizontally or vertically first
    if (this.R() < 0.5) {
      for (let x = a.x; x !== b.x; x += xStep) path.push({x, y: a.y});
      for (let y = a.y; y !== b.y; y += yStep) path.push({x: b.x, y});
    } else {
      for (let y = a.y; y !== b.y; y += yStep) path.push({x: a.x, y});
      for (let x = a.x; x !== b.x; x += xStep) path.push({x, y: b.y});
    }
    path.push({x: b.x, y: b.y});
    return path;
  }

  /**
   * Trim path to remove points inside rooms and ensure connection at room edges
   */
  private trimPath(
    path: { x: number; y: number }[],
    a: Room,
    b: Room,
  ): { x: number; y: number }[] {
    const inside = (p: { x: number; y: number }, r: Room): boolean =>
      p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
    
    // Remove points inside rooms
    while (path.length && inside(path[0], a)) path.shift();
    while (path.length && inside(path[path.length - 1], b)) path.pop();
    
    return path;
  }

  /**
   * Create a path between two rooms based on corridor type
   */
  private createPath(type: string, room1: Room, room2: Room, allRooms: Room[], mapWidth: number, mapHeight: number): { 
    path: { x: number; y: number }[]; 
    doorStart: { x: number; y: number }; 
    doorEnd: { x: number; y: number }; 
  } {
    // Calculate door connection points on room edges instead of room centers
    const connectionPoints = this.calculateConnectionPoints(room1, room2);
    const startPoint = connectionPoints.start;
    const endPoint = connectionPoints.end;
    
    // Pass ALL rooms as obstacles to A* pathfinding
    // The cost grid will handle allowing access to door connection points
    let path: { x: number; y: number }[] = [];
    switch (type) {
      case 'maze':
      case 'winding':
      case 'straight':
      default:
        // Use A* pathfinding with cost grid for all corridor types
        // This ensures corridors avoid room interiors while finding optimal paths
        path = this.findPathAStar(startPoint, endPoint, allRooms, mapWidth, mapHeight);
        break;
    }

    return { path, doorStart: connectionPoints.doorStart, doorEnd: connectionPoints.doorEnd };
  }

  /**
   * Calculate the best connection points on the edges of two rooms
   */
  private calculateConnectionPoints(room1: Room, room2: Room): {
    start: { x: number; y: number };
    end: { x: number; y: number };
    doorStart: { x: number; y: number };
    doorEnd: { x: number; y: number };
  } {
    // Handle shaped rooms using room shape service
    const center1 = this.getRoomCenter(room1);
    const center2 = this.getRoomCenter(room2);
    
    // Determine the best edge for each room based on the direction to the other room
    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;
    
    let start: { x: number; y: number };
    let end: { x: number; y: number };
    
    // Find door positions ON the room walls
    let startDoor: { x: number; y: number };
    let endDoor: { x: number; y: number };
    let startDirection: 'top' | 'bottom' | 'left' | 'right';
    let endDirection: 'top' | 'bottom' | 'left' | 'right';
    

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        // room2 is to the right of room1
        startDirection = 'right';
        endDirection = 'left';
        startDoor = this.findClosestPointOnRoomEdge(room1, 'right', center2);
        endDoor = this.findClosestPointOnRoomEdge(room2, 'left', center1);
      } else {
        // room2 is to the left of room1
        startDirection = 'left';
        endDirection = 'right';
        startDoor = this.findClosestPointOnRoomEdge(room1, 'left', center2);
        endDoor = this.findClosestPointOnRoomEdge(room2, 'right', center1);
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        // room2 is below room1
        startDirection = 'bottom';
        endDirection = 'top';
        startDoor = this.findClosestPointOnRoomEdge(room1, 'bottom', center2);
        endDoor = this.findClosestPointOnRoomEdge(room2, 'top', center1);
      } else {
        // room2 is above room1
        startDirection = 'top';
        endDirection = 'bottom';
        startDoor = this.findClosestPointOnRoomEdge(room1, 'top', center2);
        endDoor = this.findClosestPointOnRoomEdge(room2, 'bottom', center1);
      }
    }
    start = startDoor;
    end = endDoor;
    
    return { start, end, doorStart: startDoor, doorEnd: endDoor };
  }

  /**
   * Get the center point of a room, accounting for different shapes
   */
  private getRoomCenter(room: Room): { x: number; y: number } {
    if (room.shape === 'rectangular' || !room.shapePoints) {
      return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
    } else {
      // For shaped rooms, use the room bounds center
      const bounds = roomShapeService.getRoomBounds(room);
      return { 
        x: (bounds.minX + bounds.maxX) / 2, 
        y: (bounds.minY + bounds.maxY) / 2 
      };
    }
  }

  /**
   * Find the closest point on a room's edge in the specified direction
   */
  private findClosestPointOnRoomEdge(room: Room, edge: 'top' | 'bottom' | 'left' | 'right', targetPoint: { x: number; y: number }): { x: number; y: number } {
    // Use the room shape service to find the actual closest edge point
    return roomShapeService.findClosestEdgePoint(room, edge, targetPoint);
  }



  /**
   * Create a maze-like path between two points
   */
  private createMazePathBetweenPoints(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let currentX = start.x;
    let currentY = start.y;
    
    while (currentX !== end.x || currentY !== end.y) {
      path.push({ x: currentX, y: currentY });
      
      if (currentX < end.x) currentX++;
      else if (currentX > end.x) currentX--;
      
      if (currentY < end.y) currentY++;
      else if (currentY > end.y) currentY--;
      
      // Add some randomness for maze-like appearance
      if (this.R() < 0.3) {
        const randomX = currentX + (this.R() < 0.5 ? 1 : -1);
        const randomY = currentY + (this.R() < 0.5 ? 1 : -1);
        path.push({ x: randomX, y: randomY });
      }
    }
    path.push({ x: end.x, y: end.y });
    return path;
  }

  /**
   * Create a winding path between two points
   */
  private createWindingPathBetweenPoints(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let currentX = start.x;
    let currentY = start.y;
    
    while (currentX !== end.x || currentY !== end.y) {
      path.push({ x: currentX, y: currentY });
      
      // Add winding movement
      if (this.R() < 0.7) {
        if (currentX < end.x) currentX++;
        else if (currentX > end.x) currentX--;
      } else {
        if (currentY < end.y) currentY++;
        else if (currentY > end.y) currentY--;
      }
    }
    path.push({ x: end.x, y: end.y });
    return path;
  }

  /**
   * Create a straight path between two points
   */
  private createStraightPathBetweenPoints(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let currentX = start.x;
    let currentY = start.y;
    
    while (currentX !== end.x || currentY !== end.y) {
      path.push({ x: currentX, y: currentY });
      
      if (currentX < end.x) currentX++;
      else if (currentX > end.x) currentX--;
      
      if (currentY < end.y) currentY++;
      else if (currentY > end.y) currentY--;
    }
    path.push({ x: end.x, y: end.y });
    return path;
  }

  /**
   * Create a maze path between two points with collision detection
   */
  private createMazePathWithCollisionDetection(start: { x: number; y: number }, end: { x: number; y: number }, rooms: Room[], excludeRooms: string[]): { x: number; y: number }[] {
    // Create spatial index for efficient collision detection
    const roomSpatialIndex = this.createRoomSpatialIndex(rooms);
    
    // First try the original maze path
    const originalPath = this.createMazePathBetweenPoints(start, end);
    const allowedEdgePoints = [start, end];
    const collisions = this.countRoomCollisions(originalPath, rooms, allowedEdgePoints, roomSpatialIndex);
    
    if (collisions === 0) {
      return originalPath; // Use original if no collisions
    }
    
    // If there are collisions, fall back to battle map path which has collision avoidance
    return this.createBattleMapPath(start, end, rooms, excludeRooms);
  }

  /**
   * Create a winding path between two points with collision detection
   */
  private createWindingPathWithCollisionDetection(start: { x: number; y: number }, end: { x: number; y: number }, rooms: Room[], excludeRooms: string[]): { x: number; y: number }[] {
    // Create spatial index for efficient collision detection
    const roomSpatialIndex = this.createRoomSpatialIndex(rooms);
    
    // First try the original winding path
    const originalPath = this.createWindingPathBetweenPoints(start, end);
    const allowedEdgePoints = [start, end];
    const collisions = this.countRoomCollisions(originalPath, rooms, allowedEdgePoints, roomSpatialIndex);
    
    if (collisions === 0) {
      return originalPath; // Use original if no collisions
    }
    
    // If there are collisions, fall back to battle map path which has collision avoidance
    return this.createBattleMapPath(start, end, rooms, excludeRooms);
  }

  /**
   * Expand a single-width corridor path to the specified width for battle map compatibility
   */
  private expandCorridorToWidth(path: { x: number; y: number }[], width: number): { x: number; y: number }[] {
    if (width === 1 || path.length === 0) return path;
    
    const expandedTiles = new Set<string>();
    
    // Add the original path
    path.forEach(tile => {
      expandedTiles.add(`${tile.x},${tile.y}`);
    });
    
    // For each tile in the path, add adjacent tiles to create width
    path.forEach((tile, i) => {
      const prevTile = i > 0 ? path[i - 1] : null;
      const nextTile = i < path.length - 1 ? path[i + 1] : null;
      
      // Determine the direction of travel to expand perpendicular to it
      let expandDirection = { x: 0, y: 1 }; // Default to vertical expansion
      
      if (nextTile) {
        const dx = nextTile.x - tile.x;
        const dy = nextTile.y - tile.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal movement, expand vertically
          expandDirection = { x: 0, y: 1 };
        } else {
          // Vertical movement, expand horizontally
          expandDirection = { x: 1, y: 0 };
        }
      } else if (prevTile) {
        const dx = tile.x - prevTile.x;
        const dy = tile.y - prevTile.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal movement, expand vertically
          expandDirection = { x: 0, y: 1 };
        } else {
          // Vertical movement, expand horizontally
          expandDirection = { x: 1, y: 0 };
        }
      }
      
      // Add expansion tiles
      const expansion = Math.floor((width - 1) / 2);
      for (let offset = -expansion; offset <= expansion; offset++) {
        if (offset === 0) continue; // Already have the center tile
        
        const expandedX = tile.x + expandDirection.x * offset;
        const expandedY = tile.y + expandDirection.y * offset;
        expandedTiles.add(`${expandedX},${expandedY}`);
      }
    });
    
    // Convert back to array of points
    return Array.from(expandedTiles).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
  }

  /**
   * Check if a point is ON a room wall (edge), not inside the room
   */
  private isPointOnRoomWall(room: Room, x: number, y: number): boolean {
    if (room.shape === 'rectangular' || !room.shapePoints) {
      // For rectangular rooms, check if point is on any of the four walls (within room bounds)
      const onLeftWall = x === room.x && y >= room.y && y < room.y + room.h;
      const onRightWall = x === room.x + room.w - 1 && y >= room.y && y < room.y + room.h;
      const onTopWall = y === room.y && x >= room.x && x < room.x + room.w;
      const onBottomWall = y === room.y + room.h - 1 && x >= room.x && x < room.x + room.w;
      
      return onLeftWall || onRightWall || onTopWall || onBottomWall;
    } else {
      // For shaped rooms, use room shape service to check if point is on the edge
      return roomShapeService.isPointOnRoomEdge(room, x, y);
    }
  }

  /**
   * Check if a point collides with any room interior (corridors should go around rooms, not through them)
   */
  private isRoomCollision(x: number, y: number, rooms: Room[], allowedEdgePoints: { x: number; y: number }[] = [], roomSpatialIndex?: SpatialIndex): boolean {
    // Use spatial indexing if available for O(log n) performance instead of O(n) linear search
    if (roomSpatialIndex) {
      const pointQuery = pointToSpatialItem(`point-${x}-${y}`, x, y, 0);
      const candidateRooms = roomSpatialIndex.search(pointQuery);
      
      // Only check rooms that could potentially contain this point
      for (const spatialItem of candidateRooms) {
        const room = spatialItem.data as Room;
        if (!room) continue;
        
        // Use room shape service for accurate collision detection
        const insideRoom = roomShapeService.isPointInRoom(room, x, y);
        
        if (insideRoom) {
          // Allow specific edge points (door connections)
          const isAllowedEdgePoint = allowedEdgePoints.some(point => point.x === x && point.y === y);
          if (isAllowedEdgePoint) {
            return false; // This is an allowed door connection point
          }
          
          // Check if this point is ON a room wall (not inside)
          if (this.isPointOnRoomWall(room, x, y)) {
            return false; // Allow corridor points on room walls (door connections)
          }
          
          return true; // Collision detected - corridor should not go through room interior
        }
      }
      return false; // No collision with room interiors
    }
    
    // Fallback to linear search if no spatial index provided
    for (const room of rooms) {
      // Use room shape service for accurate collision detection
      const insideRoom = roomShapeService.isPointInRoom(room, x, y);
      
      if (insideRoom) {
        // Allow specific edge points (door connections)
        const isAllowedEdgePoint = allowedEdgePoints.some(point => point.x === x && point.y === y);
        if (isAllowedEdgePoint) {
          return false; // This is an allowed door connection point
        }
        
        // Check if this point is ON a room wall (not inside)
        if (this.isPointOnRoomWall(room, x, y)) {
          return false; // Allow corridor points on room walls (door connections)
        }
        
        return true; // Collision detected - corridor should not go through room interior
      }
    }
    return false; // No collision with room interiors
  }

  /**
   * Create a more battle-map friendly path with proper wall avoidance
   */
  private createBattleMapPath(start: { x: number; y: number }, end: { x: number; y: number }, rooms?: Room[], excludeRooms?: string[]): { x: number; y: number }[] {
    // If no rooms provided for collision detection, fall back to simple L-shaped path
    if (!rooms) {
      return this.createSimpleLShapedPath(start, end);
    }
    
    // Create spatial index for efficient collision detection
    const roomSpatialIndex = this.createRoomSpatialIndex(rooms);
    
    // Define allowed edge points (start and end door connections)
    const allowedEdgePoints = [start, end];
    
    // Try both horizontal-first and vertical-first approaches
    const horizontalFirstPath = this.createLShapedPathWithCollisionAvoidance(start, end, true, rooms, allowedEdgePoints);
    const verticalFirstPath = this.createLShapedPathWithCollisionAvoidance(start, end, false, rooms, allowedEdgePoints);
    
    // Choose the path with fewer room collisions
    const horizontalCollisions = this.countRoomCollisions(horizontalFirstPath, rooms, allowedEdgePoints, roomSpatialIndex);
    const verticalCollisions = this.countRoomCollisions(verticalFirstPath, rooms, allowedEdgePoints, roomSpatialIndex);
    
    if (horizontalCollisions === 0 && verticalCollisions === 0) {
      // Both paths are clean, choose randomly for variety
      return this.R() < 0.5 ? horizontalFirstPath : verticalFirstPath;
    } else if (horizontalCollisions === 0) {
      return horizontalFirstPath;
    } else if (verticalCollisions === 0) {
      return verticalFirstPath;
    } else {
      // Both have collisions, choose the one with fewer
      return horizontalCollisions <= verticalCollisions ? horizontalFirstPath : verticalFirstPath;
    }
  }

  /**
   * Create simple L-shaped path without collision detection
   */
  private createSimpleLShapedPath(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let currentX = start.x;
    let currentY = start.y;
    
    const horizontalFirst = this.R() < 0.5;
    
    if (horizontalFirst) {
      // Move horizontally first, then vertically
      while (currentX !== end.x) {
        path.push({ x: currentX, y: currentY });
        currentX += currentX < end.x ? 1 : -1;
      }
      while (currentY !== end.y) {
        path.push({ x: currentX, y: currentY });
        currentY += currentY < end.y ? 1 : -1;
      }
    } else {
      // Move vertically first, then horizontally  
      while (currentY !== end.y) {
        path.push({ x: currentX, y: currentY });
        currentY += currentY < end.y ? 1 : -1;
      }
      while (currentX !== end.x) {
        path.push({ x: currentX, y: currentY });
        currentX += currentX < end.x ? 1 : -1;
      }
    }
    
    path.push({ x: end.x, y: end.y });
    return path;
  }

  /**
   * Create L-shaped path with collision avoidance
   */
  private createLShapedPathWithCollisionAvoidance(start: { x: number; y: number }, end: { x: number; y: number }, horizontalFirst: boolean, rooms: Room[], allowedEdgePoints: { x: number; y: number }[]): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let currentX = start.x;
    let currentY = start.y;
    
    if (horizontalFirst) {
      // Move horizontally first, then vertically
      while (currentX !== end.x) {
        path.push({ x: currentX, y: currentY });
        currentX += currentX < end.x ? 1 : -1;
      }
      while (currentY !== end.y) {
        path.push({ x: currentX, y: currentY });
        currentY += currentY < end.y ? 1 : -1;
      }
    } else {
      // Move vertically first, then horizontally  
      while (currentY !== end.y) {
        path.push({ x: currentX, y: currentY });
        currentY += currentY < end.y ? 1 : -1;
      }
      while (currentX !== end.x) {
        path.push({ x: currentX, y: currentY });
        currentX += currentX < end.x ? 1 : -1;
      }
    }
    
    path.push({ x: end.x, y: end.y });
    return path;
  }

  /**
   * Count room collisions in a path
   */
  private countRoomCollisions(path: { x: number; y: number }[], rooms: Room[], allowedEdgePoints: { x: number; y: number }[], roomSpatialIndex?: SpatialIndex): number {
    let collisions = 0;
    for (const point of path) {
      if (this.isRoomCollision(point.x, point.y, rooms, allowedEdgePoints, roomSpatialIndex)) {
        collisions++;
      }
    }
    return collisions;
  }

  /**
   * Create a spatial index for rooms to enable O(log n) collision detection
   */
  private createRoomSpatialIndex(rooms: Room[]): SpatialIndex {
    const spatialIndex = new SpatialIndex();
    const spatialItems = rooms.map(room => 
      roomToSpatialItem(
        room.id,
        room.x,
        room.y,
        room.w,
        room.h,
        0, // No spacing for exact room boundaries
        room
      )
    );
    spatialIndex.load(spatialItems);
    return spatialIndex;
  }

  /**
   * Generate a cost grid for A* pathfinding
   * Higher costs discourage pathfinding through certain areas (like room interiors)
   */
  private generateCostGrid(rooms: Room[], width: number, height: number, start: { x: number; y: number }, end: { x: number; y: number }): number[][] {
    // Initialize with base cost of 1 for all tiles
    const costGrid: number[][] = Array(height).fill(null).map(() => Array(width).fill(1));
    
    // Set high cost for room interiors to discourage pathfinding through them
    for (const room of rooms) {
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            // High cost for room interiors (20x normal cost)
            costGrid[y][x] = 20;
          }
        }
      }
      
      // Lower cost for room edges where doors can be placed (still higher than empty space)
      // This allows corridors to connect to rooms but discourages going through them
      const edgePositions = this.getRoomEdgePositions(room);
      for (const pos of edgePositions) {
        if (pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height) {
          costGrid[pos.y][pos.x] = 3;
        }
      }
    }
    
    // Ensure start and end positions have reasonable cost
    if (start.x >= 0 && start.x < width && start.y >= 0 && start.y < height) {
      costGrid[start.y][start.x] = 1;
    }
    if (end.x >= 0 && end.x < width && end.y >= 0 && end.y < height) {
      costGrid[end.y][end.x] = 1;
    }
    
    
    return costGrid;
  }

  /**
   * Get all edge positions of a room for cost grid calculation
   */
  private getRoomEdgePositions(room: Room): { x: number; y: number }[] {
    const edges: { x: number; y: number }[] = [];
    
    // Top and bottom edges
    for (let x = room.x; x < room.x + room.w; x++) {
      edges.push({ x, y: room.y }); // Top edge
      edges.push({ x, y: room.y + room.h - 1 }); // Bottom edge
    }
    
    // Left and right edges (excluding corners already added)
    for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
      edges.push({ x: room.x, y }); // Left edge
      edges.push({ x: room.x + room.w - 1, y }); // Right edge
    }
    
    return edges;
  }

  /**
   * A* pathfinding with cost grid support
   * Finds optimal path while avoiding high-cost areas (like room interiors)
   */
  private findPathAStar(
    start: { x: number; y: number },
    goal: { x: number; y: number },
    rooms: Room[],
    width: number,
    height: number
  ): { x: number; y: number }[] {
    // Generate cost grid
    const costGrid = this.generateCostGrid(rooms, width, height, start, goal);
    const openSet = new PriorityQueue();
    const closedSet = new Set<string>();
    const gScores = new Map<string, number>();
    
    // Heuristic function (Manhattan distance)
    const heuristic = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    };
    
    // Create start node
    const startNode: PathNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: heuristic(start, goal),
      f: heuristic(start, goal)
    };
    
    openSet.enqueue(startNode);
    gScores.set(`${start.x},${start.y}`, 0);
    
    while (!openSet.isEmpty()) {
      const currentNode = openSet.dequeue()!;
      const nodeKey = `${currentNode.x},${currentNode.y}`;
      
      // Goal reached
      if (currentNode.x === goal.x && currentNode.y === goal.y) {
        const path: { x: number; y: number }[] = [];
        let current: PathNode | undefined = currentNode;
        while (current) {
          path.unshift({ x: current.x, y: current.y });
          current = current.parent;
        }
        return path;
      }
      
      closedSet.add(nodeKey);
      
      // Check neighbors (4-directional movement)
      const neighbors = [
        { x: currentNode.x + 1, y: currentNode.y },
        { x: currentNode.x - 1, y: currentNode.y },
        { x: currentNode.x, y: currentNode.y + 1 },
        { x: currentNode.x, y: currentNode.y - 1 }
      ];
      
      for (const neighbor of neighbors) {
        // Skip if out of bounds
        if (neighbor.x < 0 || neighbor.x >= width || neighbor.y < 0 || neighbor.y >= height) {
          continue;
        }
        
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        // Skip if already evaluated
        if (closedSet.has(neighborKey)) {
          continue;
        }
        
        // Calculate cost using the cost grid
        const moveCost = costGrid[neighbor.y][neighbor.x];
        const tentativeG = currentNode.g + moveCost;
        
        // Check if this path to neighbor is better than any previous one
        const previousG = gScores.get(neighborKey);
        if (previousG === undefined || tentativeG < previousG) {
          gScores.set(neighborKey, tentativeG);
          
          const neighborNode: PathNode = {
            x: neighbor.x,
            y: neighbor.y,
            g: tentativeG,
            h: heuristic(neighbor, goal),
            f: tentativeG + heuristic(neighbor, goal),
            parent: currentNode
          };
          
          openSet.enqueue(neighborNode);
        }
      }
    }
    
    // No path found, fallback to simple L-shaped path
    return this.createSimpleLShapedPath(start, goal);
  }

  /**
   * Add special features like stairs and entrances
   */
  private addSpecialFeatures(rooms: Room[], boundaries: LayoutBoundary[], stairsUp: boolean, stairsDown: boolean, entranceFromPeriphery: boolean): Room[] {
    const specialRooms: Room[] = [];
    
    if (stairsUp) {
      const boundary = this.selectRandomBoundary(boundaries);
      specialRooms.push({
        id: 'stairs-up',
        kind: 'special',
        x: Math.floor(boundary.x + boundary.width * 0.3),
        y: Math.floor(boundary.y + boundary.height * 0.3),
        w: 2,
        h: 2,
        shape: 'rectangular',
        tags: ['stairs', 'up', 'exit']
      });
    }
    
    if (stairsDown) {
      const boundary = this.selectRandomBoundary(boundaries);
      specialRooms.push({
        id: 'stairs-down',
        kind: 'special',
        x: Math.floor(boundary.x + boundary.width * 0.6),
        y: Math.floor(boundary.y + boundary.height * 0.6),
        w: 2,
        h: 2,
        shape: 'rectangular',
        tags: ['stairs', 'down', 'entrance']
      });
    }
    
    if (entranceFromPeriphery) {
      const boundary = this.selectRandomBoundary(boundaries);
      specialRooms.push({
        id: 'entrance',
        kind: 'special',
        x: Math.floor(boundary.x),
        y: Math.floor(boundary.y),
        w: 3,
        h: 3,
        shape: 'rectangular',
        tags: ['entrance', 'periphery']
      });
    }
    
    return specialRooms;
  }

  /**
   * Generate doors for corridors
   */
  private generateDoors(corridors: Corridor[]): Door[] {
    return corridors.flatMap((corridor) => {
      if (corridor.path.length === 0) return [];
      
      // Use the actual door positions if available, otherwise fall back to path endpoints
      const startLocation = corridor.doorStart || corridor.path[0];
      const endLocation = corridor.doorEnd || corridor.path[corridor.path.length - 1];
      
      return [
        generateDoor(this.R, { fromRoom: corridor.from, toRoom: corridor.to, location: startLocation }),
        generateDoor(this.R, { fromRoom: corridor.to, toRoom: corridor.from, location: endLocation }),
      ];
    });
  }
}

// Export singleton instance
export const mapGenerator = new MapGenerator();
