import { Dungeon, Room, Corridor, Door, RoomShape } from '../core/types';
import { rng, id } from './random';
import { generateDoor } from './doors';
import { roomShapeService, ShapePreferences } from './room-shapes';
import { connectRooms } from './corridors';
import { SpatialIndex, roomToSpatialItem, spatialItemsOverlap } from '../utils/spatial-index';
import { roomsOverlap } from '../utils/room-utils';

// A* pathfinding node for corridor generation
// Removed legacy A* node/queue structs (routing handled in corridors.ts)

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
    const specialRooms = this.addSpecialFeatures(dungeonRooms, boundaries, stairsUp, stairsDown, entranceFromPeriphery, width, height);
    
    // Combine all rooms for corridor generation and clamp to map bounds
    let allRooms = this.clampRooms([...dungeonRooms, ...specialRooms], width, height);

    // Generate corridors using shared corridor service (respecting room boundaries)
    let corridors = connectRooms(allRooms, this.R, {
      algorithm: (pathfindingAlgorithm as any) || 'astar',
      usePathfindingLib: (pathfindingAlgorithm as any) !== 'manhattan',
      // Only prefer L-shape when explicitly using 'manhattan'
      preferLShape: (pathfindingAlgorithm as any) === 'manhattan',
    });
    // Expand corridors to desired width while avoiding room interiors
    if (corridorWidth && corridorWidth > 1) {
      corridors = corridors.map(c => ({
        ...c,
        path: this.expandCorridorToWidth(c.path, corridorWidth, allRooms)
      }));
    }
    corridors = this.clampCorridors(corridors, width, height);

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

  private clampRooms(rooms: Room[], mapWidth: number, mapHeight: number): Room[] {
    return rooms.map(room => {
      let x = Math.max(0, room.x);
      let y = Math.max(0, room.y);
      let w = room.w;
      let h = room.h;
      if (x + w > mapWidth) {
        w = mapWidth - x;
      }
      if (y + h > mapHeight) {
        h = mapHeight - y;
      }
      return { ...room, x, y, w, h };
    });
  }

  private clampCorridors(corridors: Corridor[], mapWidth: number, mapHeight: number): Corridor[] {
    const clampPoint = (p: { x: number; y: number }) => ({
      x: Math.min(Math.max(p.x, 0), mapWidth - 1),
      y: Math.min(Math.max(p.y, 0), mapHeight - 1),
    });

    return corridors.map(corridor => {
      const doorStart = corridor.doorStart ? clampPoint(corridor.doorStart) : undefined;
      const doorEnd = corridor.doorEnd ? clampPoint(corridor.doorEnd) : undefined;
      const path = corridor.path.map(clampPoint);

      if (doorStart && path.length) {
        path[0] = doorStart;
      }
      if (doorEnd && path.length) {
        path[path.length - 1] = doorEnd;
      }

      return {
        ...corridor,
        path,
        doorStart,
        doorEnd,
      };
    });
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
          const chosenBoundary = this.selectRandomBoundary(boundaries);
          const roomSize = this.getRoomSize(size, 'medium');
          const centerX = chosenBoundary.x + chosenBoundary.width / 2;
          const centerY = chosenBoundary.y + chosenBoundary.height / 2;
          
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
          const room1FitsInBoundary = (
            room1.x >= chosenBoundary.x &&
            room1.y >= chosenBoundary.y &&
            room1.x + room1.width <= chosenBoundary.x + chosenBoundary.width &&
            room1.y + room1.height <= chosenBoundary.y + chosenBoundary.height
          );
          const room2FitsInBoundary = (
            room2.x >= chosenBoundary.x &&
            room2.y >= chosenBoundary.y &&
            room2.x + room2.width <= chosenBoundary.x + chosenBoundary.width &&
            room2.y + room2.height <= chosenBoundary.y + chosenBoundary.height
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
          // Ensure the pair does not overlap each other (with spacing)
          const pairNoOverlap = !spatialItemsOverlap(room1SpatialItem, room2SpatialItem, spacing);
          
          const room1Fits = room1FitsInBoundary && room1NoOverlap;
          const room2Fits = room2FitsInBoundary && room2NoOverlap;
          
          // Only add both if both fit, ensuring symmetry
          if (room1Fits && room2Fits && pairNoOverlap) {
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
  // Deprecated: local corridor generation method removed — use corridors.ts via connectRooms()

  /**
   * Build a graph connecting rooms using Delaunay triangulation and MST
   */
  /*
   * Removed legacy corridor graph/pathing helpers in favor of corridors.ts
   * (buildRoomGraph, connectRoomsWithGraph, manhattanPath, etc.)
   */
  /* private buildRoomGraph(rooms: Room[], allowDeadends: boolean): Array<[number, number]> {
    if (rooms.length < 2) return [];

    const centers = rooms.map(r => [r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2)] as const);
    const delaunay = Delaunator.from(centers);
    const edgeMap = new Map<string, { a: number; b: number; d: number }>();

    const addEdge = (i: number, j: number): void => {
      if (i > j) [i, j] = [j, i];
      const key = `${i}-${j}`;
      if (!edgeMap.has(key)) {
        const d = distance(
          { x: centers[i][0], y: centers[i][1] }, 
          { x: centers[j][0], y: centers[j][1] }
        );
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
          const d = distance(
            { x: centers[i][0], y: centers[i][1] }, 
            { x: centers[j][0], y: centers[j][1] }
          );
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
          const d = distance(
            { x: centers[i][0], y: centers[i][1] }, 
            { x: centers[j][0], y: centers[j][1] }
          );
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
  } */

  /**
   * Connect rooms using pre-calculated room graph and pathfinding options
   */
  // Removed legacy corridor connector (use corridors.ts)

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
  // Removed: manhattanPath

  /**
   * Trim path to remove points inside rooms and ensure connection at room edges
   */
  // Removed: trimPath

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
  // Removed legacy connection point helpers (handled in corridors.ts)

  /**
   * Get the center point of a room, accounting for different shapes
   */
  // Removed: getRoomCenter

  /**
   * Find the closest point on a room's edge in the specified direction
   */
  // Removed: findClosestPointOnRoomEdge



  /**
   * Create a maze-like path between two points
   */
  // Removed: createMazePathBetweenPoints (style now via cost shaping/post-process)

  /**
   * Create a winding path between two points
   */
  // Removed: createWindingPathBetweenPoints

  /**
   * Create a straight path between two points
   */
  // Removed: createStraightPathBetweenPoints

  /**
   * Create a maze path between two points with collision detection
   */
  // Removed: createMazePathWithCollisionDetection

  /**
   * Create a winding path between two points with collision detection
   */
  // Removed: createWindingPathWithCollisionDetection

  /**
   * Expand a single-width corridor path to the specified width for battle map compatibility
   */
  private expandCorridorToWidth(path: { x: number; y: number }[], width: number, rooms: Room[]): { x: number; y: number }[] {
    if (width === 1 || path.length === 0) return path;
    
    const expandedTiles = new Set<string>();

    const isInterior = (x: number, y: number): boolean => {
      for (const room of rooms) {
        const inRoom = room.shape !== 'rectangular' && room.shapePoints
          ? roomShapeService.isPointInRoom(room, x, y)
          : (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h);
        if (inRoom) {
          const onEdge = room.shape !== 'rectangular' && room.shapePoints
            ? roomShapeService.isPointOnRoomEdge(room, x, y)
            : (
                (x === room.x || x === room.x + room.w - 1) && y >= room.y && y < room.y + room.h
              ) || (
                (y === room.y || y === room.y + room.h - 1) && x >= room.x && x < room.x + room.w
              );
          if (!onEdge) return true; // Interior collision
        }
      }
      return false;
    };

    // Clearance buffer in tiles from room interiors
    const buffer = 1;
    const nearInterior = (x: number, y: number): boolean => {
      // Check Manhattan neighborhood within 'buffer'
      for (let dy = -buffer; dy <= buffer; dy++) {
        for (let dx = -buffer; dx <= buffer; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > buffer) continue;
          if (isInterior(x + dx, y + dy)) return true;
        }
      }
      return false;
    };
    
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
        // Do not add expansion tiles inside or adjacent to room interiors
        if (!isInterior(expandedX, expandedY) && !nearInterior(expandedX, expandedY)) {
          expandedTiles.add(`${expandedX},${expandedY}`);
        }
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
  // Removed: isPointOnRoomWall

  /**
   * Check if a point collides with any room interior (corridors should go around rooms, not through them)
   */
  // Removed: isRoomCollision

  /**
   * Create a more battle-map friendly path with proper wall avoidance
   */
  // Removed: createBattleMapPath

  /**
   * Create simple L-shaped path without collision detection
   */
  // Removed: createSimpleLShapedPath

  /**
   * Create L-shaped path with collision avoidance
   */
  // Removed: createLShapedPathWithCollisionAvoidance

  /**
   * Count room collisions in a path
   */
  // Removed: countRoomCollisions

  /**
   * Create a spatial index for rooms to enable O(log n) collision detection
   */
  // Removed: createRoomSpatialIndex

  /**
   * Generate a cost grid for A* pathfinding
   * Higher costs discourage pathfinding through certain areas (like room interiors)
   */
  // Removed: generateCostGrid

  /**
   * Get all edge positions of a room for cost grid calculation
   */
  // Removed: getRoomEdgePositions

  /**
   * A* pathfinding using pathfinding library with cost grid support
   * Finds optimal path while avoiding high-cost areas (like room interiors)
   */
  // Removed: findPathAStar

  /**
   * Add special features like stairs and entrances
   */
  private addSpecialFeatures(rooms: Room[], boundaries: LayoutBoundary[], stairsUp: boolean, stairsDown: boolean, entranceFromPeriphery: boolean, mapWidth: number, mapHeight: number): Room[] {
    const specialRooms: Room[] = [];
    
    // Build an occupancy grid for robust, exact overlap checks
    const occupied: boolean[][] = Array.from({ length: mapHeight }, () => Array<boolean>(mapWidth).fill(false));
    const markRect = (x: number, y: number, w: number, h: number) => {
      for (let yy = y; yy < y + h; yy++) {
        if (yy < 0 || yy >= mapHeight) continue;
        for (let xx = x; xx < x + w; xx++) {
          if (xx < 0 || xx >= mapWidth) continue;
          occupied[yy][xx] = true;
        }
      }
    };
    const markRoom = (r: Room) => {
      // Shape-aware marking
      const minX = Math.max(0, Math.floor(r.shape === 'rectangular' || !r.shapePoints ? r.x : roomShapeService.getRoomBounds(r).minX));
      const maxX = Math.min(mapWidth - 1, Math.ceil(r.shape === 'rectangular' || !r.shapePoints ? r.x + r.w - 1 : roomShapeService.getRoomBounds(r).maxX));
      const minY = Math.max(0, Math.floor(r.shape === 'rectangular' || !r.shapePoints ? r.y : roomShapeService.getRoomBounds(r).minY));
      const maxY = Math.min(mapHeight - 1, Math.ceil(r.shape === 'rectangular' || !r.shapePoints ? r.y + r.h - 1 : roomShapeService.getRoomBounds(r).maxY));
      for (let yy = minY; yy <= maxY; yy++) {
        for (let xx = minX; xx <= maxX; xx++) {
          if (roomShapeService.isPointInRoom(r, xx, yy)) {
            occupied[yy][xx] = true;
          }
        }
      }
    };
    rooms.forEach(markRoom);

    const canPlace = (x: number, y: number, w: number, h: number): boolean => {
      if (x < 0 || y < 0 || x + w > mapWidth || y + h > mapHeight) return false;
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) {
          if (occupied[yy][xx]) return false;
        }
      }
      return true;
    };
    const place = (id: string, x: number, y: number, w: number, h: number, tags: string[]) => {
      const room: Room = { id, kind: 'special', x, y, w, h, shape: 'rectangular', tags };
      specialRooms.push(room);
      markRect(x, y, w, h);
    };

    const tryPlace = (
      id: string,
      w: number,
      h: number,
      tags: string[],
      preferredPos: (b: LayoutBoundary) => { x: number; y: number }
    ): void => {
      const maxBoundaryTries = Math.max(1, boundaries.length);
      const maxTriesPerBoundary = 20;
      // Simple shuffled copy of boundaries for variety
      const order = boundaries.map((b, i) => i).sort(() => (this.R() < 0.5 ? -1 : 1));

      let placed = false;
      for (let bi = 0; bi < maxBoundaryTries && !placed; bi++) {
        const b = boundaries[order[bi]];
        const minX = Math.floor(b.x);
        const minY = Math.floor(b.y);
        const maxX = Math.floor(b.x + b.width - w);
        const maxY = Math.floor(b.y + b.height - h);
        if (maxX < minX || maxY < minY) continue; // special doesn't fit this boundary

        // Try preferred spot first
        const pref = preferredPos(b);
        const px = Math.max(minX, Math.min(maxX, Math.floor(pref.x)));
        const py = Math.max(minY, Math.min(maxY, Math.floor(pref.y)));
        if (canPlace(px, py, w, h)) {
          place(id, px, py, w, h, tags);
          placed = true;
          break;
        }

        // Random retries inside boundary
        for (let t = 0; t < maxTriesPerBoundary && !placed; t++) {
          const rx = Math.floor(minX + this.R() * (maxX - minX + 1));
          const ry = Math.floor(minY + this.R() * (maxY - minY + 1));
          if (canPlace(rx, ry, w, h)) {
            place(id, rx, ry, w, h, tags);
            placed = true;
            break;
          }
        }
      }
      // If unable to place after all attempts, skip this special
    };

    if (stairsUp) {
      tryPlace(
        'stairs-up',
        2,
        2,
        ['stairs', 'up', 'exit'],
        (b) => ({ x: b.x + b.width * 0.3, y: b.y + b.height * 0.3 })
      );
    }
    if (stairsDown) {
      tryPlace(
        'stairs-down',
        2,
        2,
        ['stairs', 'down', 'entrance'],
        (b) => ({ x: b.x + b.width * 0.6, y: b.y + b.height * 0.6 })
      );
    }
    if (entranceFromPeriphery) {
      // Prefer near top-left periphery within a boundary; fallback random
      tryPlace(
        'entrance',
        3,
        3,
        ['entrance', 'periphery'],
        (b) => ({ x: b.x, y: b.y })
      );
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
