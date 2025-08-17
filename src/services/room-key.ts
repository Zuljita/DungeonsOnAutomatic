import { Dungeon, Monster, Treasure, ID } from '../core/types';
import { customDataLoader } from './custom-data-loader';
import DFRPGEncounterGenerator from '../systems/dfrpg/DFRPGEncounterGenerator.js';

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

export function featureRoom(r: () => number, moduleId: string = 'generic'): string[] {
  const features: string[] = [];
  
  // Check for custom decorations first
  const customDecorations = customDataLoader.getDecorations(moduleId);
  
  if (customDecorations.length > 0) {
    // Use custom decorations
    const weightedCustom: Weighted<string>[] = customDecorations.map(d => ({
      item: d.name,
      weight: d.weight
    }));
    
    if (r() < 0.7) {
      features.push(weightedPick(r, weightedCustom));
      if (r() < 0.3) features.push(weightedPick(r, weightedCustom));
    }
  } else {
    // Use default features
    if (r() < 0.7) {
      features.push(weightedPick(r, FEATURE_TABLE));
      if (r() < 0.3) features.push(weightedPick(r, FEATURE_TABLE));
    }
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

export function populateRooms(d: Dungeon, r: () => number = Math.random, moduleId: string = 'generic'): Record<ID, RoomDetail> {
  const details: Record<ID, RoomDetail> = {};
  const encounterGen = moduleId === 'dfrpg' ? new DFRPGEncounterGenerator(r) : undefined;
  for (const room of d.rooms) {
    let monsters: Monster[] = [];
    let treasure: Treasure[] = [];
    if (encounterGen && r() < 0.5) {
      const enc = encounterGen.generate({ 
        characterPoints: 100, 
        biome: 'dungeon',
        threatLevel: 'Average',
        preferGroupedEncounters: true
      });
      monsters = enc.monsters;
      if (enc.treasure.totalValue > 0) {
        treasure.push({ kind: 'coins', valueHint: `$${enc.treasure.totalValue}` });
      }
    } else {
      monsters = d.encounters?.[room.id]?.monsters ?? monsterRoom(r);
      treasure = d.encounters?.[room.id]?.treasure ?? treasureRoom(r, monsters.length > 0);
    }
    const features = featureRoom(r, moduleId);
    details[room.id] = { features, monsters, treasure };
  }
  return details;
}

export function htmlRoomDetails(d: Dungeon, details: Record<ID, RoomDetail>): string {
  if (!d) {
    console.error('htmlRoomDetails: dungeon is undefined');
    return '<p>Error: No dungeon data</p>';
  }
  if (!d.rooms) {
    console.error('htmlRoomDetails: dungeon.rooms is undefined');
    return '<p>Error: No room data</p>';
  }
  if (!Array.isArray(d.rooms)) {
    console.error('htmlRoomDetails: dungeon.rooms is not an array', d.rooms);
    return '<p>Error: Invalid room data</p>';
  }
  
  return d.rooms
    .map((room, index) => {
      const det = details[room.id] ?? { features: [], monsters: [], treasure: [] };
      
      // Ensure all properties exist and are arrays
      const safeFeatures = Array.isArray(det.features) ? det.features : [];
      const safeMonsters = Array.isArray(det.monsters) ? det.monsters : [];
      const safeTreasure = Array.isArray(det.treasure) ? det.treasure : [];
      
      const parts: string[] = [`<section class="room"><h3>Room ${index + 1} (${room.kind})</h3>`];
      
      // Display room description if present
      if (room.description) {
        parts.push(`<p><strong>Environment:</strong> ${room.description}</p>`);
      }
      
      // Display room tags if present
      if (room.tags && room.tags.length > 0) {
        const tagHtml = room.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ');
        parts.push(`<p><strong>Tags:</strong> ${tagHtml}</p>`);
      }
      
      if (safeFeatures.length) {
        parts.push(`<p><strong>Features:</strong> ${safeFeatures.join(', ')}</p>`);
      }
      if (safeMonsters.length) {
        const monsterDetails = safeMonsters.map(m => {
          const monsterInfo = [m.name];
          
          // Add CER and challenge level if available
          if (m.cer !== undefined && m.challenge_level) {
            monsterInfo.push(`(CER ${m.cer} - ${m.challenge_level})`);
          } else if (m.cer !== undefined) {
            monsterInfo.push(`(CER ${m.cer})`);
          } else if (m.challenge_level) {
            monsterInfo.push(`(${m.challenge_level})`);
          }
          
          if (m.tags && m.tags.length > 0) {
            monsterInfo.push(`[${m.tags.join(', ')}]`);
          }
          return monsterInfo.join(' ');
        });
        parts.push(`<p><strong>Monsters:</strong> ${monsterDetails.join(', ')}</p>`);
      }
      if (safeTreasure.length) {
        const treasureDetails = safeTreasure.map(t => {
          const treasureInfo = [t.kind + (t.valueHint ? ` (${t.valueHint})` : '')];
          if (t.tags && t.tags.length > 0) {
            treasureInfo.push(`[${t.tags.join(', ')}]`);
          }
          return treasureInfo.join(' ');
        });
        parts.push(`<p><strong>Treasure:</strong> ${treasureDetails.join(', ')}</p>`);
      }
      parts.push('</section>');
      return parts.join('\n');
    })
    .join('\n');
}

