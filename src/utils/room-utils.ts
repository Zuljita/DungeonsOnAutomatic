/**
 * Room utility functions for common room operations
 * Consolidates duplicate room checking patterns found across 15+ files
 */

import { Room } from '../core/types';
import { roomShapeService } from '../services/room-shapes';

/**
 * Check if a room is rectangular (has no custom shape points)
 * Consolidates duplicate room shape checking logic
 */
export function isRectangularRoom(room: Room): boolean {
  return room.shape === 'rectangular' || !room.shapePoints;
}

/**
 * Check if a room has custom shape points
 */
export function isShapedRoom(room: Room): boolean {
  return !isRectangularRoom(room);
}

/**
 * Check if a point is on the border of a room
 * Consolidates duplicate border detection logic found in 3+ files
 */
export function isPointOnRoomBorder(room: Room, x: number, y: number): boolean {
  if (!roomShapeService.isPointInRoom(room, x, y)) {
    return false;
  }

  // Check if any adjacent point is outside the room
  const adjacentPoints = [
    { x: x - 1, y },
    { x: x + 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 }
  ];

  return adjacentPoints.some(point => 
    !roomShapeService.isPointInRoom(room, point.x, point.y)
  );
}

/**
 * Get all points within a room
 */
export function getRoomPoints(room: Room): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  
  if (isRectangularRoom(room)) {
    // For rectangular rooms, iterate through the bounding box
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        points.push({ x, y });
      }
    }
  } else {
    // For shaped rooms, use the shape points
    points.push(...(room.shapePoints || []));
  }
  
  return points;
}

/**
 * Get all border points of a room
 */
export function getRoomBorderPoints(room: Room): { x: number; y: number }[] {
  const allPoints = getRoomPoints(room);
  return allPoints.filter(point => isPointOnRoomBorder(room, point.x, point.y));
}

/**
 * Get the center point of a room
 */
export function getRoomCenter(room: Room): { x: number; y: number } {
  return {
    x: room.x + Math.floor(room.w / 2),
    y: room.y + Math.floor(room.h / 2)
  };
}

/**
 * Check if two rooms overlap
 */
export function roomsOverlap(room1: Room, room2: Room): boolean {
  // For rectangular rooms, use bounding box check
  if (isRectangularRoom(room1) && isRectangularRoom(room2)) {
    return !(
      room1.x + room1.w <= room2.x ||
      room2.x + room2.w <= room1.x ||
      room1.y + room1.h <= room2.y ||
      room2.y + room2.h <= room1.y
    );
  }
  
  // For shaped rooms, check point intersection
  const points1 = getRoomPoints(room1);
  return points1.some(point => roomShapeService.isPointInRoom(room2, point.x, point.y));
}

/**
 * Get the distance between two room centers
 */
export function getDistanceBetweenRooms(room1: Room, room2: Room): number {
  const center1 = getRoomCenter(room1);
  const center2 = getRoomCenter(room2);
  
  const dx = center2.x - center1.x;
  const dy = center2.y - center1.y;
  
  return Math.sqrt(dx * dx + dy * dy);
}