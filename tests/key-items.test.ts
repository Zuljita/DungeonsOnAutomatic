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
    const key = keyItemService.generate_key(
      'door1',
      PlacementRule.REQUIRED,
      PlacementTarget.MONSTER_LOOT,
    );
    expect(keyItemService.get_unplaced_keys()).toEqual([key]);
  });

  it('marks keys as placed', () => {
    const key = keyItemService.generate_key(
      'door2',
      PlacementRule.REQUIRED,
      PlacementTarget.TREASURE_CHEST,
    );
    keyItemService.mark_as_placed(key.id, 'chest1');
    expect(keyItemService.get_unplaced_keys()).toHaveLength(0);
  });

  it('ignores lost keys when listing unplaced', () => {
    keyItemService.generate_key(
      'door3',
      PlacementRule.LOST,
      PlacementTarget.MONSTER_LOOT,
    );
    expect(keyItemService.get_unplaced_keys()).toHaveLength(0);
  });
});
