import { Door, ID } from '../core/types';
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
  while (queue.length) {
    const room = queue.shift()!;
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
  while (queue.length) {
    const room = queue.shift()!;
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

  while (queue.length) {
    const { room, keys } = queue.shift()!;
    const keyString = Array.from(keys).sort().join(',');
    const stateKey = `${room}|${keyString}`;
    if (seen.has(stateKey)) continue;
    seen.add(stateKey);

    if (room === goal) return true;

    const newKeys = new Set(keys);
    for (const item of keyItemService.get_keys_in_location(room)) {
      newKeys.add(item.doorId);
    }

    for (const edge of graph[room] ?? []) {
      if (isLocked(edge.door) && !newKeys.has(edge.door!.id)) continue;
      queue.push({ room: edge.to, keys: new Set(newKeys) });
    }
  }

  return false;
}

export type { PathGraph as Graph, PathEdge as Edge };
