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

export interface Dungeon {
  seed: string;
  rooms: Room[];
  corridors: Corridor[];
  encounters?: Record<ID, { monsters?: Monster[]; traps?: Trap[]; treasure?: Treasure[] }>;
}

export interface SystemModule {
  id: string;
  label: string;
  enrich(d: Dungeon, opts?: Record<string, unknown>): Promise<Dungeon> | Dungeon;
}
