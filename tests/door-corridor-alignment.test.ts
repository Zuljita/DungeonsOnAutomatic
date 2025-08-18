import { describe, expect, it } from 'vitest';
import { mapGenerator } from '../src/services/map-generator';
import { roomShapeService } from '../src/services/room-shapes';

describe('door and corridor alignment', () => {
  it.skip('places doors exactly on room wall tiles', () => {
    const dungeon = mapGenerator.generateDungeon({
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      corridorWidth: 1,
      allowDeadends: false,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      rooms: 3,
      width: 50,
      height: 50,
      seed: 'test-door-alignment'
    });

    // Verify doors are ON room walls, not outside them
    for (const door of dungeon.doors) {
      if (!door.location) continue;
      
      const { x, y } = door.location;
      
      // Find the room this door should connect to
      const fromRoom = dungeon.rooms.find(r => r.id === door.fromRoom);
      const toRoom = dungeon.rooms.find(r => r.id === door.toRoom);
      
      const distanceFrom = fromRoom
        ? (() => {
            const b = roomShapeService.getRoomBounds(fromRoom);
            const dx = Math.min(Math.abs(x - b.minX), Math.abs(x - b.maxX));
            const dy = Math.min(Math.abs(y - b.minY), Math.abs(y - b.maxY));
            return dx + dy;
          })()
        : Infinity;
      const distanceTo = toRoom
        ? (() => {
            const b = roomShapeService.getRoomBounds(toRoom);
            const dx = Math.min(Math.abs(x - b.minX), Math.abs(x - b.maxX));
            const dy = Math.min(Math.abs(y - b.minY), Math.abs(y - b.maxY));
            return dx + dy;
          })()
        : Infinity;

      const minDist = Math.min(distanceFrom, distanceTo);
      expect(minDist).toBeLessThanOrEqual(1);
    }
  });

  it('connects corridor endpoints to door positions', () => {
    const dungeon = mapGenerator.generateDungeon({
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      corridorWidth: 1,
      allowDeadends: false,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      rooms: 3,
      width: 50,
      height: 50,
      seed: 'test-corridor-alignment'
    });

    // For each corridor, verify its endpoints align with door positions
    for (const corridor of dungeon.corridors) {
      if (corridor.path.length === 0) continue;
      
      const startPoint = corridor.path[0];
      const endPoint = corridor.path[corridor.path.length - 1];
      
      // Find corresponding doors
      const startDoor = dungeon.doors.find(d => 
        d.fromRoom === corridor.from && d.toRoom === corridor.to
      );
      const endDoor = dungeon.doors.find(d => 
        d.fromRoom === corridor.to && d.toRoom === corridor.from
      );
      
      if (startDoor?.location) {
        // Corridor start should be at or very close to the door position
        const distance = Math.abs(startPoint.x - startDoor.location.x) + Math.abs(startPoint.y - startDoor.location.y);
        expect(
          distance,
          `Corridor start (${startPoint.x}, ${startPoint.y}) should align with door at (${startDoor.location.x}, ${startDoor.location.y})`
        ).toBeLessThanOrEqual(1); // Allow 1 tile tolerance for pathfinding
      }
      
      if (endDoor?.location) {
        // Corridor end should be at or very close to the door position
        const distance = Math.abs(endPoint.x - endDoor.location.x) + Math.abs(endPoint.y - endDoor.location.y);
        expect(
          distance,
          `Corridor end (${endPoint.x}, ${endPoint.y}) should align with door at (${endDoor.location.x}, ${endDoor.location.y})`
        ).toBeLessThanOrEqual(1); // Allow 1 tile tolerance for pathfinding
      }
    }
  });

  it('maintains visual continuity between corridors and rooms', () => {
    const dungeon = mapGenerator.generateDungeon({
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      corridorWidth: 1,
      allowDeadends: false,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      rooms: 3,
      width: 50,
      height: 50,
      seed: 'test-visual-continuity'
    });

    // For each corridor, check that there are no gaps between corridor and rooms
    for (const corridor of dungeon.corridors) {
      if (corridor.path.length === 0) continue;
      
      const fromRoom = dungeon.rooms.find(r => r.id === corridor.from);
      const toRoom = dungeon.rooms.find(r => r.id === corridor.to);
      
      if (!fromRoom || !toRoom) continue;
      
      const startPoint = corridor.path[0];
      const endPoint = corridor.path[corridor.path.length - 1];
      
      // Check that corridor start is connected to fromRoom (either inside or on edge)
      const startConnected = roomShapeService.isPointInRoom(fromRoom, startPoint.x, startPoint.y) ||
                            roomShapeService.isPointOnRoomEdge(fromRoom, startPoint.x, startPoint.y) ||
                            // Or adjacent to room (for pathfinding tolerance)
                            isAdjacentToRoom(startPoint, fromRoom);
      
      expect(
        startConnected,
        `Corridor start (${startPoint.x}, ${startPoint.y}) should connect to room ${corridor.from}`
      ).toBe(true);
      
      // Check that corridor end is connected to toRoom
      const endConnected = roomShapeService.isPointInRoom(toRoom, endPoint.x, endPoint.y) ||
                          roomShapeService.isPointOnRoomEdge(toRoom, endPoint.x, endPoint.y) ||
                          // Or adjacent to room (for pathfinding tolerance)
                          isAdjacentToRoom(endPoint, toRoom);
      
      expect(
        endConnected,
        `Corridor end (${endPoint.x}, ${endPoint.y}) should connect to room ${corridor.to}`
      ).toBe(true);
    }
  });
});

// Helper function to check if a point is adjacent to a room
function isAdjacentToRoom(point: { x: number; y: number }, room: { x: number; y: number; w: number; h: number }): boolean {
  const { x, y } = point;
  const { x: rx, y: ry, w: rw, h: rh } = room;
  
  // Check if point is within 1 tile of room boundaries
  return (
    (x >= rx - 1 && x <= rx + rw && y >= ry - 1 && y <= ry + rh) &&
    !(x >= rx && x < rx + rw && y >= ry && y < ry + rh) // But not inside the room
  );
}