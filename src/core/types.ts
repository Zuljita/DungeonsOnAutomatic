export type ID = string;

export type RoomShape = 'rectangular' | 'circular' | 'hexagonal' | 'octagonal' | 'irregular' | 'L-shaped' | 'T-shaped' | 'cross';

export interface Room {
  id: ID;
  kind: 'chamber' | 'hall' | 'cavern' | 'lair' | 'special' | 'exit to upper level' | 'entrance to lower level' | 'dungeon entrance';
  x: number;  // center x for non-rectangular shapes, top-left x for rectangular
  y: number;  // center y for non-rectangular shapes, top-left y for rectangular
  w: number;  // width in grid units (radius for circular, distance for hexagonal)
  h: number;  // height in grid units (same as w for circular/hexagonal)
  shape: RoomShape; // Shape of the room
  shapePoints?: { x: number; y: number }[]; // Explicit shape points for irregular rooms
  tags?: string[];
  description?: string; // Environmental and thematic description
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
  fromRoom?: ID;
  toRoom?: ID;
  location?: { x: number; y: number };
}

export interface Monster {
  name: string;
  sm?: number | null;
  cls?: string;
  class?: string; // Alternative property name for class
  subclass?: string;
  notes?: string;
  source?: string;
  reference?: string;
  threat_rating?: 'fodder' | 'worthy' | 'boss';
  group_size?: string;
  tactics?: string;
  frequency?: 'very_rare' | 'rare' | 'uncommon' | 'common' | 'very_common';
  tags?: string[]; // Thematic tags for tag-based selection
  cer?: number; // Challenge Equivalent Rating (GURPS point value)
  challenge_level?: string; // Human-readable challenge description
}

export interface WanderingMonster {
  roll: string; // e.g., "2-4"
  monster: Monster;
  quantity: string; // e.g., "1d3"
}

export interface DungeonDefaults {
  name?: string;
  manaLevel?: 'none' | 'low' | 'normal' | 'high' | 'very_high';
  sanctity?: 'cursed' | 'defiled' | 'neutral' | 'blessed' | 'holy';
  nature?: 'dead' | 'weak' | 'normal' | 'strong' | 'primal';
}

// Type alias for RNG function
export type RNG = () => number;

export interface EnvironmentalDetail {
  name: string;
  description: string;
  weight: number;
}

export interface DungeonEnvironment {
  lighting: EnvironmentalDetail;
  ceiling: EnvironmentalDetail;
  manaLevel?: EnvironmentalDetail;
  sanctityLevel?: EnvironmentalDetail;
  naturesStrength?: EnvironmentalDetail;
}

export interface Trap {
  name: string;
  level?: number;
  notes?: string;
  category?: 'mechanical' | 'magical' | 'alchemical' | 'divine' | 'hybrid';
  trigger?: string;
  detection?: string;
  disarm?: string;
  effect?: string;
  tags?: string[]; // Thematic tags for tag-based selection
  weight?: number;
}

export interface Treasure {
  kind: 'coins' | 'gems' | 'art' | 'gear' | 'magic' | 'other';
  valueHint?: string; // system-agnostic, e.g., 'minor', 'standard', 'major'
  tags?: string[]; // Thematic tags for tag-based selection
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

export interface Lock {
  id: ID;
  doorId: ID;
  quality: 'simple' | 'average' | 'good' | 'fine' | 'magical';
  material: 'wood' | 'stone' | 'iron' | 'steel';
  requiresKey: boolean;
  description?: string;
}

export interface KeyItem {
  id: ID;
  doorId: ID;
  name: string;
  type: string;
  placementRule: PlacementRule;
  placementTarget: PlacementTarget;
  locationId?: ID;
  description?: string;
}

export interface Dungeon {
  seed: string;
  rooms: Room[];
  corridors: Corridor[];
  doors: Door[];
  rng?: () => number;
  encounters?: Record<ID, { monsters?: Monster[]; traps?: Trap[]; treasure?: Treasure[] }>;
  keyItems?: KeyItem[];
  locks?: Lock[];
  wanderingMonsters?: WanderingMonster[];
  environment?: DungeonEnvironment;
  defaults?: DungeonDefaults;
}

export interface SystemModule {
  id: string;
  label: string;
  enrich(d: Dungeon, opts?: Record<string, unknown>): Promise<Dungeon> | Dungeon;
}
