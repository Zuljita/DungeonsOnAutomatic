import { describe, it, expect, beforeEach } from 'vitest';
import {
  keyItemService,
  PlacementRule,
  PlacementTarget,
} from '../src/services/key-items.js';

describe('key item service', () => {
  beforeEach(() => {
    keyItemService.reset();
  });

  it('generates and lists unplaced keys', () => {
    const key = keyItemService.generateKey(
      'door1',
      PlacementRule.REQUIRED,
      PlacementTarget.MONSTER_LOOT,
    );
    expect(keyItemService.getUnplacedKeys()).toEqual([key]);
  });

  it('marks keys as placed', () => {
    const key = keyItemService.generateKey(
      'door2',
      PlacementRule.REQUIRED,
      PlacementTarget.TREASURE_CHEST,
    );
    keyItemService.markAsPlaced(key.id, 'chest1');
    expect(keyItemService.getUnplacedKeys()).toHaveLength(0);
  });

  it('ignores lost keys when listing unplaced', () => {
    keyItemService.generateKey(
      'door3',
      PlacementRule.LOST,
      PlacementTarget.MONSTER_LOOT,
    );
    expect(keyItemService.getUnplacedKeys()).toHaveLength(0);
  });
});
