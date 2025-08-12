export type ID = string;

export interface Room {
  id: ID;
  kind: 'chamber' | 'hall' | 'cavern' | 'lair' | 'special';
  x: number;  // top-left x in grid units
  y: number;  // top-left y in grid units
  w: number;  // width in grid units
  h: number;  // height in grid units
  tags?: string[];
}

export interface Corridor {
  id: ID;
  from: ID;
  to: ID;
  path: { x: number; y: number; }[]; // polyline grid path
}

export interface Door {
  id: ID;
  type: 'normal' | 'arch' | 'portcullis' | 'hole';
  status: 'locked' | 'trapped' | 'barred' | 'jammed' | 'warded' | 'secret';
}

export interface Monster {
  name: string;
  sm?: number | null;
  cls?: string;
  subclass?: string;
  notes?: string;
  source?: string;
}

export interface Trap {
  name: string;
  level?: number;
  notes?: string;
}

export interface Treasure {
  kind: 'coins' | 'gems' | 'art' | 'gear' | 'magic' | 'other';
  valueHint?: string; // system-agnostic, e.g., 'minor', 'standard', 'major'
}

export enum PlacementRule {
  REQUIRED = 'REQUIRED',
  OPTIONAL = 'OPTIONAL',
  HIDDEN = 'HIDDEN',
  LOST = 'LOST',
}

export enum PlacementTarget {
  MONSTER_LOOT = 'MONSTER_LOOT',
  TREASURE_CHEST = 'TREASURE_CHEST',
  ROOM_FEATURE = 'ROOM_FEATURE',
  NPC_POSSESSION = 'NPC_POSSESSION',
}

export interface KeyItem {
  id: ID;
  doorId: ID;
  name: string;
  type: string;
  placementRule: PlacementRule;
  placementTarget: PlacementTarget;
  locationId?: ID;
}

export interface Dungeon {
  seed: string;
  rooms: Room[];
  corridors: Corridor[];
  encounters?: Record<ID, { monsters?: Monster[]; traps?: Trap[]; treasure?: Treasure[] }>;
  keyItems?: KeyItem[];
}

export interface SystemModule {
  id: string;
  label: string;
  enrich(d: Dungeon, opts?: Record<string, unknown>): Promise<Dungeon> | Dungeon;
}
