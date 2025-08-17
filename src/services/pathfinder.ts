import { Door, ID, Dungeon, KeyItem } from '../core/types';
import { keyItemService } from './key-items';

export interface PathEdge {
  to: ID;
  door?: Door;
}

export type PathGraph = Record<ID, PathEdge[]>;

function isLocked(door?: Door): boolean {
  return door?.status === 'locked';
}

export function isPathPossible(graph: PathGraph, start: ID, goal: ID): boolean {
  const visited = new Set<ID>();
  const queue: ID[] = [start];
  let i = 0;
  while (i < queue.length) {
    const room = queue[i++]!;
    if (room === goal) return true;
    if (visited.has(room)) continue;
    visited.add(room);
    for (const edge of graph[room] ?? []) {
      if (isLocked(edge.door)) continue;
      queue.push(edge.to);
    }
  }
  return false;
}

export function isPathPossibleWithLockpicking(
  graph: PathGraph,
  start: ID,
  goal: ID,
): boolean {
  const visited = new Set<ID>();
  const queue: ID[] = [start];
  let i = 0;
  while (i < queue.length) {
    const room = queue[i++]!;
    if (room === goal) return true;
    if (visited.has(room)) continue;
    visited.add(room);
    for (const edge of graph[room] ?? []) {
      queue.push(edge.to);
    }
  }
  return false;
}

export function isPathPossibleWithBacktracking(
  graph: PathGraph,
  start: ID,
  goal: ID,
): boolean {
  type State = { room: ID; keys: Set<ID> };
  const queue: State[] = [{ room: start, keys: new Set() }];
  const seen = new Set<string>();

  let i = 0;
  while (i < queue.length) {
    const { room, keys } = queue[i++]!;
    const keyString = Array.from(keys).sort().join(',');
    const stateKey = `${room}|${keyString}`;
    if (seen.has(stateKey)) continue;
    seen.add(stateKey);

    if (room === goal) return true;

    const newKeys = new Set(keys);
    for (const item of keyItemService.getKeysInLocation(room)) {
      newKeys.add(item.doorId);
    }

    for (const edge of graph[room] ?? []) {
      if (isLocked(edge.door) && !newKeys.has(edge.door!.id)) continue;
      queue.push({ room: edge.to, keys: new Set(newKeys) });
    }
  }

  return false;
}

/**
 * Build a path graph from a dungeon for pathfinding
 */
export function buildPathGraph(dungeon: Dungeon): PathGraph {
  const graph: PathGraph = {};
  
  // Initialize graph with all rooms
  for (const room of dungeon.rooms) {
    graph[room.id] = [];
  }
  
  // Add edges based on corridors and doors
  for (const corridor of dungeon.corridors) {
    // Find doors for this corridor
    const doorsForCorridor = dungeon.doors.filter(door => 
      (door.fromRoom === corridor.from && door.toRoom === corridor.to) ||
      (door.fromRoom === corridor.to && door.toRoom === corridor.from)
    );
    
    // If there are doors, use the first one to represent the connection
    const door = doorsForCorridor[0];
    
    // Add bidirectional edges
    if (!graph[corridor.from]) graph[corridor.from] = [];
    if (!graph[corridor.to]) graph[corridor.to] = [];
    
    graph[corridor.from].push({ to: corridor.to, door });
    graph[corridor.to].push({ to: corridor.from, door });
  }
  
  return graph;
}

/**
 * Enhanced pathfinding that considers key collection and locked doors
 * This is the main method specified in the design document
 */
export function isPathWithKeysPossible(
  dungeon: Dungeon,
  start?: ID,
  goal?: ID
): boolean {
  // Default start: entrance room or first room
  const startRoom = start || findEntranceRoom(dungeon)?.id || dungeon.rooms[0]?.id;
  
  // Default goal: last room or any room with stairs down
  const goalRoom = goal || findGoalRoom(dungeon)?.id;
  
  if (!startRoom || !goalRoom) {
    return false; // No valid start or goal
  }
  
  if (startRoom === goalRoom) {
    return true; // Already at goal
  }
  
  // Build path graph
  const graph = buildPathGraph(dungeon);
  
  // Use state-based pathfinding that tracks collected keys
  type PathState = { 
    room: ID; 
    keys: Set<ID>; // Set of door IDs that can be unlocked
  };
  
  const queue: PathState[] = [{ room: startRoom, keys: new Set() }];
  const visited = new Map<string, Set<string>>(); // room -> set of key combinations tried
  
  let iterations = 0;
  const maxIterations = 10000; // Prevent infinite loops
  
  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const { room, keys } = queue.shift()!;
    
    // Create unique key for this state
    const keyArray = Array.from(keys).sort();
    const stateKey = `${room}|${keyArray.join(',')}`;
    
    // Check if we've been in this room with this set of keys before
    if (!visited.has(room)) {
      visited.set(room, new Set());
    }
    const roomVisited = visited.get(room)!;
    const keySignature = keyArray.join(',');
    
    if (roomVisited.has(keySignature)) {
      continue; // Already explored this state
    }
    roomVisited.add(keySignature);
    
    // Check if we reached the goal
    if (room === goalRoom) {
      return true;
    }
    
    // Collect any keys in this room
    const newKeys = new Set(keys);
    const keysInRoom = (dungeon.keyItems || []).filter(key => key.locationId === room);
    for (const key of keysInRoom) {
      newKeys.add(key.doorId);
    }
    
    // Explore adjacent rooms
    const edges = graph[room] || [];
    for (const edge of edges) {
      const door = edge.door;
      
      // Check if we can pass through this door
      if (door && isLocked(door)) {
        // Door is locked - can we unlock it?
        if (!newKeys.has(door.id)) {
          continue; // Don't have the key
        }
      }
      
      // Add this room to the queue with updated keys
      queue.push({ room: edge.to, keys: new Set(newKeys) });
    }
  }
  
  return false; // No path found
}

/**
 * Find the entrance room (starting point)
 */
function findEntranceRoom(dungeon: Dungeon): { id: ID } | null {
  // Look for rooms marked as entrance
  const entranceRoom = dungeon.rooms.find(room =>
    room.id === 'entrance' ||
    room.tags?.includes('entrance') ||
    (room.kind === 'special' && room.tags?.includes('entrance'))
  );
  
  if (entranceRoom) {
    return { id: entranceRoom.id };
  }
  
  // Fallback to first room
  return dungeon.rooms[0] ? { id: dungeon.rooms[0].id } : null;
}

/**
 * Find the goal room (ending point)
 */
function findGoalRoom(dungeon: Dungeon): { id: ID } | null {
  // Look for stairs down or exit rooms
  const goalRoom = dungeon.rooms.find(room =>
    room.id === 'stairs-down' ||
    room.tags?.includes('down') ||
    room.tags?.includes('exit') ||
    (room.kind === 'special' && (room.tags?.includes('down') || room.tags?.includes('exit')))
  );
  
  if (goalRoom) {
    return { id: goalRoom.id };
  }
  
  // Fallback to last room
  const lastRoom = dungeon.rooms[dungeon.rooms.length - 1];
  return lastRoom ? { id: lastRoom.id } : null;
}

/**
 * Validate that the dungeon is solvable with the current key placement
 * This is a convenience method for the enrichment process
 */
export function validateDungeonSolvability(dungeon: Dungeon): {
  solvable: boolean;
  message?: string;
} {
  const startRoom = findEntranceRoom(dungeon);
  const goalRoom = findGoalRoom(dungeon);
  
  if (!startRoom || !goalRoom) {
    return {
      solvable: false,
      message: 'Could not identify start or goal room'
    };
  }
  
  const solvable = isPathWithKeysPossible(dungeon, startRoom.id, goalRoom.id);
  
  return {
    solvable,
    message: solvable ? 'Dungeon is solvable' : 'No valid path exists with current key placement'
  };
}

export type { PathGraph as Graph, PathEdge as Edge };
