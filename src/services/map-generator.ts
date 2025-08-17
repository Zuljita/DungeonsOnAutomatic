import { Dungeon, Room, Corridor, Door } from '../core/types';
import { rng } from './random';
import Delaunator from 'delaunator';
import { generateDoor } from './doors';

export interface MapGenerationOptions {
  // Layout Types
  layoutType: 'rectangle' | 'square' | 'box' | 'cross' | 'dagger' | 'saltire' | 'keep' | 'hexagon' | 'round' | 'cavernous';
  
  // Room Configuration
  roomLayout: 'sparse' | 'scattered' | 'dense' | 'symmetric';
  roomSize: 'small' | 'medium' | 'large' | 'mixed';
  roomShape: 'rectangular' | 'round' | 'hexagonal' | 'mixed';
  
  // Corridor Configuration
  corridorType: 'maze' | 'winding' | 'straight' | 'mixed';
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

    const { rooms, width, height, layoutType, roomLayout, roomSize, roomShape, corridorType, corridorWidth, allowDeadends, stairsUp, stairsDown, entranceFromPeriphery } = options;

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
    const corridors = this.generateCorridors(allRooms, corridorType, corridorWidth, allowDeadends);
    
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
   * Now includes overlap detection to prevent overlapping rooms
   */
  private generateRoomBoundaries(
    boundaries: LayoutBoundary[],
    roomCount: number,
    layout: string,
    size: string,
    shape: string
  ): LayoutBoundary[] {
    const roomBoundaries: LayoutBoundary[] = [];
    const maxAttempts = roomCount * 50; // Same as rooms.ts
    let attempts = 0;

    const overlaps = (a: LayoutBoundary, b: LayoutBoundary): boolean => {
      // Same logic as rooms.ts - includes 1-tile padding
      return !(
        a.x + a.width + 1 <= b.x ||
        b.x + b.width + 1 <= a.x ||
        a.y + a.height + 1 <= b.y ||
        b.y + b.height + 1 <= a.y
      );
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

      // Check for overlaps with existing rooms
      if (roomBoundaries.some(existingRoom => overlaps(existingRoom, candidateRoom))) {
        return false;
      }

      roomBoundaries.push(candidateRoom);
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
          
          const room1NoOverlap = !roomBoundaries.some(existingRoom => overlaps(existingRoom, room1));
          const room2NoOverlap = !roomBoundaries.some(existingRoom => overlaps(existingRoom, room2));
          
          const room1Fits = room1FitsInBoundary && room1NoOverlap;
          const room2Fits = room2FitsInBoundary && room2NoOverlap;
          
          // Only add both if both fit, ensuring symmetry
          if (room1Fits && room2Fits) {
            roomBoundaries.push(room1);
            roomBoundaries.push(room2);
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
  private createRooms(boundaries: LayoutBoundary[], shape: string): Room[] {
    return boundaries.map((boundary, index) => {
      const roomShape = shape === 'mixed' ? this.getRandomShape() : shape;
      return this.createRoom(boundary, roomShape, index);
    });
  }

  /**
   * Create a single room with the specified shape
   */
  private createRoom(boundary: LayoutBoundary, shape: string, index: number): Room {
    const id = `room-${index}`;
    
    switch (shape) {
      case 'round':
        // Approximate circle with room kind
        return {
          id,
          kind: 'chamber',
          x: Math.floor(boundary.x),
          y: Math.floor(boundary.y),
          w: Math.floor(boundary.width),
          h: Math.floor(boundary.height),
          tags: ['round', 'chamber']
        };
      
      case 'hexagonal':
        // Approximate hexagon
        return {
          id,
          kind: 'chamber',
          x: Math.floor(boundary.x),
          y: Math.floor(boundary.y),
          w: Math.floor(boundary.width),
          h: Math.floor(boundary.height),
          tags: ['hexagonal', 'chamber']
        };
      
      case 'rectangular':
      default:
        return {
          id,
          kind: 'chamber',
          x: Math.floor(boundary.x),
          y: Math.floor(boundary.y),
          w: Math.floor(boundary.width),
          h: Math.floor(boundary.height),
          tags: ['rectangular', 'chamber']
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
  private generateCorridors(rooms: Room[], type: string, width: number, allowDeadends: boolean): Corridor[] {
    const edges = this.buildRoomGraph(rooms, allowDeadends);
    const corridors: Corridor[] = [];

    const pickType = (): string =>
      type === 'mixed'
        ? ['maze', 'winding', 'straight'][Math.floor(this.R() * 3)]
        : type;

    edges.forEach(([a, b], i) => {
      const room1 = rooms[a];
      const room2 = rooms[b];
      const corridorType = pickType();
      const basePath = this.createPath(corridorType, room1, room2);
      if (basePath.length > 0) {
        // Expand path to desired width for battle map compatibility
        const path = this.expandCorridorToWidth(basePath, width);
        corridors.push({
          id: `corridor-${i}`,
          from: room1.id,
          to: room2.id,
          path
        });
      }
    });

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
      const parent = Array.from({ length: rooms.length }, (_, i) => i);
      const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
      const unite = (a: number, b: number): void => {
        parent[find(a)] = find(b);
      };
      const mstEdges: Array<[number, number]> = [];
      const extra: { a: number; b: number; d: number }[] = [];
      for (const e of edgesList) {
        if (find(e.a) !== find(e.b)) {
          unite(e.a, e.b);
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
   * Create a path between two rooms based on corridor type
   */
  private createPath(type: string, room1: Room, room2: Room): { x: number; y: number }[] {
    // Calculate door connection points on room edges instead of room centers
    const connectionPoints = this.calculateConnectionPoints(room1, room2);
    const startPoint = connectionPoints.start;
    const endPoint = connectionPoints.end;

    let path: { x: number; y: number }[] = [];
    switch (type) {
      case 'maze':
        path = this.createMazePathBetweenPoints(startPoint, endPoint);
        break;
      case 'winding':
        path = this.createWindingPathBetweenPoints(startPoint, endPoint);
        break;
      case 'straight':
      default:
        // Use battle-map friendly L-shaped paths for straight corridors
        path = this.createBattleMapPath(startPoint, endPoint);
        break;
    }

    return path;
  }

  /**
   * Calculate the best connection points on the edges of two rooms
   */
  private calculateConnectionPoints(room1: Room, room2: Room): {
    start: { x: number; y: number };
    end: { x: number; y: number };
  } {
    // Calculate room centers for direction finding
    const center1 = { x: room1.x + room1.w / 2, y: room1.y + room1.h / 2 };
    const center2 = { x: room2.x + room2.w / 2, y: room2.y + room2.h / 2 };
    
    // Determine the best edge for each room based on the direction to the other room
    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;
    
    let start: { x: number; y: number };
    let end: { x: number; y: number };
    
    // Find connection point on room1's edge facing room2
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        // room2 is to the right of room1
        start = { x: room1.x + room1.w, y: Math.floor(room1.y + room1.h / 2) };
        end = { x: room2.x, y: Math.floor(room2.y + room2.h / 2) };
      } else {
        // room2 is to the left of room1
        start = { x: room1.x, y: Math.floor(room1.y + room1.h / 2) };
        end = { x: room2.x + room2.w, y: Math.floor(room2.y + room2.h / 2) };
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        // room2 is below room1
        start = { x: Math.floor(room1.x + room1.w / 2), y: room1.y + room1.h };
        end = { x: Math.floor(room2.x + room2.w / 2), y: room2.y };
      } else {
        // room2 is above room1
        start = { x: Math.floor(room1.x + room1.w / 2), y: room1.y };
        end = { x: Math.floor(room2.x + room2.w / 2), y: room2.y + room2.h };
      }
    }
    
    return { start, end };
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
   * Create a more battle-map friendly path with proper rectilinear segments
   */
  private createBattleMapPath(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let currentX = start.x;
    let currentY = start.y;
    
    // Create an L-shaped path: horizontal first, then vertical (or vice versa based on random choice)
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
      const start = corridor.path[0];
      const end = corridor.path[corridor.path.length - 1];
      return [
        generateDoor(this.R, { fromRoom: corridor.from, toRoom: corridor.to, location: start }),
        generateDoor(this.R, { fromRoom: corridor.to, toRoom: corridor.from, location: end }),
      ];
    });
  }
}

// Export singleton instance
export const mapGenerator = new MapGenerator();
