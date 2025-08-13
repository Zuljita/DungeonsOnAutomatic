import { Dungeon, Monster, Treasure, ID } from '../core/types';

interface Weighted<T> {
  item: T;
  weight: number;
}

function weightedPick<T>(r: () => number, table: Weighted<T>[]): T {
  const total = table.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = r() * total;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll < 0) return entry.item;
  }
  return table[0].item;
}

const FEATURE_TABLE: Weighted<string>[] = [
  { item: 'crumbling statue', weight: 2 },
  { item: 'moldy furniture', weight: 3 },
  { item: 'tapestry', weight: 2 },
  { item: 'ominous altar', weight: 1 },
  { item: 'empty', weight: 5 },
];

const MONSTER_TABLE: Weighted<Monster>[] = [
  { item: { name: 'Goblin' }, weight: 4 },
  { item: { name: 'Skeleton' }, weight: 3 },
  { item: { name: 'Orc' }, weight: 2 },
  { item: { name: 'Ogre' }, weight: 1 },
];

const TREASURE_TABLE: Weighted<Treasure>[] = [
  { item: { kind: 'coins', valueHint: 'minor' }, weight: 5 },
  { item: { kind: 'gems', valueHint: 'standard' }, weight: 3 },
  { item: { kind: 'magic', valueHint: 'major' }, weight: 1 },
];

export interface RoomDetail {
  features: string[];
  monsters: Monster[];
  treasure: Treasure[];
}

export function featureRoom(r: () => number): string[] {
  const features: string[] = [];
  if (r() < 0.7) {
    features.push(weightedPick(r, FEATURE_TABLE));
    if (r() < 0.3) features.push(weightedPick(r, FEATURE_TABLE));
  }
  return features;
}

export function monsterRoom(r: () => number): Monster[] {
  const monsters: Monster[] = [];
  if (r() < 0.5) {
    monsters.push({ ...weightedPick(r, MONSTER_TABLE) });
  }
  return monsters;
}

export function treasureRoom(r: () => number, hasMonsters = false): Treasure[] {
  const treasure: Treasure[] = [];
  if (hasMonsters || r() < 0.4) {
    treasure.push({ ...weightedPick(r, TREASURE_TABLE) });
  }
  return treasure;
}

export function populateRooms(d: Dungeon, r: () => number = Math.random): Record<ID, RoomDetail> {
  const details: Record<ID, RoomDetail> = {};
  for (const room of d.rooms) {
    const monsters = d.encounters?.[room.id]?.monsters ?? monsterRoom(r);
    const treasure = d.encounters?.[room.id]?.treasure ?? treasureRoom(r, monsters.length > 0);
    const features = featureRoom(r);
    details[room.id] = { features, monsters, treasure };
  }
  return details;
}

export function htmlRoomDetails(d: Dungeon, details: Record<ID, RoomDetail>): string {
  return d.rooms
    .map((room, index) => {
      const det = details[room.id] ?? { features: [], monsters: [], treasure: [] };
      const parts: string[] = [`<section class="room"><h3>Room ${index + 1} (${room.kind})</h3>`];
      if (det.features.length) {
        parts.push(`<p><strong>Features:</strong> ${det.features.join(', ')}</p>`);
      }
      if (det.monsters.length) {
        parts.push(`<p><strong>Monsters:</strong> ${det.monsters.map(m => m.name).join(', ')}</p>`);
      }
      if (det.treasure.length) {
        parts.push(`<p><strong>Treasure:</strong> ${det.treasure.map(t => t.kind + (t.valueHint ? ` (${t.valueHint})` : '')).join(', ')}</p>`);
      }
      parts.push('</section>');
      return parts.join('\n');
    })
    .join('\n');
}

