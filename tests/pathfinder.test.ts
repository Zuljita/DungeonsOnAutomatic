import { describe, it, expect, beforeEach } from 'vitest';
import {
  isPathPossible,
  isPathPossibleWithLockpicking,
  isPathPossibleWithBacktracking,
  type Graph,
} from '../src/services/pathfinder.js';
import {
  keyItemService,
  PlacementRule,
  PlacementTarget,
} from '../src/services/key-items.js';
import type { Door } from '../src/core/types.js';

describe('pathfinder', () => {
  beforeEach(() => {
    keyItemService.reset();
  });

  it('evaluates paths considering locks, lockpicking, and key backtracking', () => {
    const door: Door = { id: 'door1', type: 'normal', status: 'locked' };
    const graph: Graph = {
      A: [
        { to: 'B', door },
        { to: 'C' },
      ],
      B: [{ to: 'A', door }],
      C: [{ to: 'A' }],
    };

    const key = keyItemService.generate_key(
      'door1',
      PlacementRule.REQUIRED,
      PlacementTarget.ROOM_FEATURE,
    );
    keyItemService.mark_as_placed(key.id, 'C');

    expect(isPathPossible(graph, 'A', 'B')).toBe(false);
    expect(isPathPossibleWithLockpicking(graph, 'A', 'B')).toBe(true);
    expect(isPathPossibleWithBacktracking(graph, 'A', 'B')).toBe(true);
  });
});
