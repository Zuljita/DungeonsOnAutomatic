import { PlacementRule, PlacementTarget, type KeyItem } from '../core/types';

class KeyItemService {
  private items = new Map<string, KeyItem>();
  private seq = 0;

  generate_key(
    doorId: string,
    placementRule: PlacementRule,
    placementTarget: PlacementTarget,
  ): KeyItem {
    const id = `key-${++this.seq}`;
    const item: KeyItem = {
      id,
      doorId,
      name: `Key for ${doorId}`,
      type: 'key',
      placementRule,
      placementTarget,
    };
    this.items.set(id, item);
    return item;
  }

  get_unplaced_keys(): KeyItem[] {
    return Array.from(this.items.values()).filter(
      (i) => !i.locationId && i.placementRule !== PlacementRule.LOST,
    );
  }

  mark_as_placed(keyId: string, locationId: string): void {
    const item = this.items.get(keyId);
    if (item) {
      item.locationId = locationId;
    }
  }

  get_keys_in_location(locationId: string): KeyItem[] {
    return Array.from(this.items.values()).filter(
      (i) => i.locationId === locationId,
    );
  }

  reset(): void {
    this.items.clear();
    this.seq = 0;
  }
}

export const keyItemService = new KeyItemService();
export { PlacementRule, PlacementTarget };
export type { KeyItem };
