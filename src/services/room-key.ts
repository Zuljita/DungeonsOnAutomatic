import { Dungeon, Monster, Treasure, ID, WanderingMonster } from '../core/types';
import { customDataLoader } from './custom-data-loader';
import DFRPGEncounterGenerator from '../systems/dfrpg/DFRPGEncounterGenerator.js';
import roomFeatureDefaults from '../data/room-features.json';

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

const DEFAULT_FEATURES: Array<{ name: string; weight: number; description: string }> =
  roomFeatureDefaults as Array<{ name: string; weight: number; description: string }>;

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

function environmentSummary(d: Dungeon): string {
  const env = d.environment;
  if (!env) return '';

  const parts: string[] = ['<section class="environment"><h3>Environment</h3>'];
  if (env.lighting) {
    parts.push(`<p><strong>Lighting:</strong> ${env.lighting.name} - ${env.lighting.description}</p>`);
  }
  if (env.ceiling) {
    parts.push(`<p><strong>Ceiling:</strong> ${env.ceiling.name} - ${env.ceiling.description}</p>`);
  }
  if (env.manaLevel) {
    parts.push(`<p><strong>Mana Level:</strong> ${env.manaLevel.name} - ${env.manaLevel.description}</p>`);
  }
  if (env.sanctityLevel) {
    parts.push(`<p><strong>Sanctity:</strong> ${env.sanctityLevel.name} - ${env.sanctityLevel.description}</p>`);
  }
  if (env.naturesStrength) {
    parts.push(`<p><strong>Nature's Strength:</strong> ${env.naturesStrength.name} - ${env.naturesStrength.description}</p>`);
  }
  parts.push('</section>');
  return parts.join('');
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
      const weightedDefaults: Weighted<string>[] = DEFAULT_FEATURES.map(f => ({
        item: f.name,
        weight: f.weight
      }));
      features.push(weightedPick(r, weightedDefaults));
      if (r() < 0.3) features.push(weightedPick(r, weightedDefaults));
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
  
  const envHtml = environmentSummary(d);
  const roomsHtml = d.rooms
    .map((room, index) => {
      const det = details[room.id] ?? { features: [], monsters: [], treasure: [] };
      
      // Ensure all properties exist and are arrays
      const safeFeatures = Array.isArray(det.features) ? det.features : [];
      const safeMonsters = Array.isArray(det.monsters) ? det.monsters : [];
      const safeTreasure = Array.isArray(det.treasure) ? det.treasure : [];
      
      // Create room title with special feature detection
      let roomTitle = `Room ${index + 1}`;
      let roomType = room.kind;
      
      // Check for special rooms and enhance the title
      if (room.kind === 'special') {
        if (room.id === 'stairs-up') {
          roomTitle = `${roomTitle} - Stairs Up`;
          roomType = 'exit to upper level';
        } else if (room.id === 'stairs-down') {
          roomTitle = `${roomTitle} - Stairs Down`;
          roomType = 'entrance to lower level';
        } else if (room.id === 'entrance') {
          roomTitle = `${roomTitle} - Entrance`;
          roomType = 'dungeon entrance';
        } else if (room.tags) {
          // Use tags to identify the special feature
          if (room.tags.includes('stairs') && room.tags.includes('up')) {
            roomTitle = `${roomTitle} - Stairs Up`;
            roomType = 'exit to upper level';
          } else if (room.tags.includes('stairs') && room.tags.includes('down')) {
            roomTitle = `${roomTitle} - Stairs Down`;
            roomType = 'entrance to lower level';
          } else if (room.tags.includes('entrance')) {
            roomTitle = `${roomTitle} - Entrance`;
            roomType = 'dungeon entrance';
          } else {
            roomType = 'special';
          }
        }
      }
      
      const parts: string[] = [`<section class="room" id="room-${index + 1}" data-room="${index + 1}"><h3>${roomTitle}</h3>`];
      
      // Add room type as a subtitle for special rooms
      if (room.kind === 'special') {
        parts.push(`<p><em>${roomType}</em></p>`);
      } else {
        parts.push(`<p><em>${roomType}</em></p>`);
      }
      
      // Display room description if present
      if (room.description) {
        parts.push(`<p><strong>Environment:</strong> ${room.description}</p>`);
      }
      
      // Display room tags if present
      if (room.tags && room.tags.length > 0) {
        const tagHtml = room.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ');
        parts.push(`<p><strong>Tags:</strong> ${tagHtml}</p>`);
      }
      
      // Features section - for special rooms, prioritize their special function
      if (room.kind === 'special') {
        const specialFeatures: string[] = [];
        
        // Add specific special features based on room type
        if (room.id === 'stairs-up' || (room.tags?.includes('stairs') && room.tags?.includes('up'))) {
          specialFeatures.push('stone staircase leading upward');
        } else if (room.id === 'stairs-down' || (room.tags?.includes('stairs') && room.tags?.includes('down'))) {
          specialFeatures.push('stone staircase leading downward');
        } else if (room.id === 'entrance' || room.tags?.includes('entrance')) {
          if (room.tags?.includes('periphery')) {
            specialFeatures.push('entrance from outside');
          } else {
            specialFeatures.push('dungeon entrance');
          }
        }
        
        // Add any additional features
        if (safeFeatures.length) {
          specialFeatures.push(...safeFeatures);
        }
        
        if (specialFeatures.length) {
          parts.push(`<p><strong>Features:</strong> ${specialFeatures.join(', ')}</p>`);
        }
      } else if (safeFeatures.length) {
        parts.push(`<p><strong>Features:</strong> ${safeFeatures.join(', ')}</p>`);
      }
      if (safeMonsters.length) {
        // Calculate total CER for the encounter
        const totalCER = safeMonsters.reduce((sum, m) => sum + (m.cer || 0), 0);
        
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
          
          // Add source/page reference if available
          if (m.reference && m.reference !== 'Unknown') {
            monsterInfo.push(`[${m.reference}]`);
          } else if (m.source && m.source !== 'Unknown') {
            monsterInfo.push(`[${m.source}]`);
          }
          
          if (m.tags && m.tags.length > 0) {
            monsterInfo.push(`<span class="monster-tags">[${m.tags.join(', ')}]</span>`);
          }
          return monsterInfo.join(' ');
        });
        
        // Include total CER in the monsters section header
        const monstersHeader = totalCER > 0 
          ? `<strong>Monsters (Total CER: ${totalCER}):</strong>` 
          : `<strong>Monsters:</strong>`;
        parts.push(`<p>${monstersHeader} ${monsterDetails.join(', ')}</p>`);
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

      // Display keys found in this room
      const keysInRoom = (d.keyItems || []).filter(key => key.locationId === room.id);
      if (keysInRoom.length > 0) {
        const keyDetails = keysInRoom.map(key => {
          // Find which door this key unlocks
          const unlockedDoor = d.doors?.find(door => door.id === key.doorId);
          const doorDescription = unlockedDoor
            ? `unlocks ${unlockedDoor.type} door ${unlockedDoor.id}`
            : `unlocks door ${key.doorId}`;

          return `<span id="key-${key.id}" data-key="${key.id}"><strong>${key.name}</strong> (${doorDescription})${key.description ? ` - ${key.description}` : ''}</span>`;
        });

        parts.push(`<p><strong>Keys Found:</strong> ${keyDetails.join(', ')}</p>`);
      }

      parts.push('</section>');
      return parts.join('\n');
    })
    .join('\n');

  return envHtml + roomsHtml;
}

/**
 * Get description for mana level
 */
function getManaDescription(level: string): string {
  switch (level) {
    case 'none': return 'No spells possible, magic items don\'t function';
    case 'low': return 'Spells at -5, double FP cost, halved recovery';
    case 'normal': return 'Standard magical conditions';
    case 'high': return 'Spells at +3, half FP cost, double recovery';
    case 'very_high': return 'Spells at +5, quarter FP cost, triple recovery, critical failure risk';
    default: return 'Unknown mana level';
  }
}

/**
 * Get description for sanctity level
 */
function getSanctityDescription(sanctity: string): string {
  switch (sanctity) {
    case 'cursed': return 'Cursed ground - evil spells enhanced, good spells hindered';
    case 'defiled': return 'Defiled by evil - minor penalty to good spells';
    case 'neutral': return 'Neutral ground - no sanctity effects';
    case 'blessed': return 'Blessed ground - minor bonus to good spells';
    case 'holy': return 'Holy ground - good spells enhanced, evil spells hindered';
    default: return 'Unknown sanctity level';
  }
}

/**
 * Get description for nature's strength
 */
function getNatureDescription(nature: string): string {
  switch (nature) {
    case 'dead': return 'No natural life - plant/animal spells hindered';
    case 'weak': return 'Sparse nature - minor penalty to nature magic';
    case 'normal': return 'Normal natural presence';
    case 'strong': return 'Abundant nature - minor bonus to nature magic';
    case 'primal': return 'Primal wilderness - nature magic enhanced';
    default: return 'Unknown nature strength';
  }
}

/**
 * Generates HTML for dungeon defaults and wandering monsters
 */
export function getDungeonMetaHtml(dungeon: Dungeon): string {
  let html = '';
  
  // Add dungeon defaults section if available
  if (dungeon.defaults) {
    const defaults = dungeon.defaults;
    html += `
      <section class="dungeon-defaults">
        <h3>Dungeon Details</h3>
        ${defaults.name ? `<p><strong>Name:</strong> ${defaults.name}</p>` : ''}
        ${defaults.manaLevel ? `<p><strong>Mana Level:</strong> ${defaults.manaLevel} - ${getManaDescription(defaults.manaLevel)}</p>` : ''}
        ${defaults.sanctity ? `<p><strong>Sanctity:</strong> ${defaults.sanctity} - ${getSanctityDescription(defaults.sanctity)}</p>` : ''}
        ${defaults.nature ? `<p><strong>Nature's Strength:</strong> ${defaults.nature} - ${getNatureDescription(defaults.nature)}</p>` : ''}
      </section>
    `;
  }
  
  // Add wandering monsters if available
  const wanderingHtml = getWanderingMonstersHtml(dungeon);
  if (wanderingHtml) {
    html += wanderingHtml;
  }
  
  return html;
}

/**
 * Generates HTML for the wandering monsters table
 */
export function getWanderingMonstersHtml(dungeon: Dungeon): string {
  if (!dungeon.wanderingMonsters || dungeon.wanderingMonsters.length === 0) {
    return '';
  }

  const tableRows = dungeon.wanderingMonsters.map(wm => {
    const monsterInfo = [wm.monster.name];
    
    // Add CER and challenge level if available
    if (wm.monster.cer !== undefined && wm.monster.challenge_level) {
      monsterInfo.push(`(CER ${wm.monster.cer} - ${wm.monster.challenge_level})`);
    } else if (wm.monster.cer !== undefined) {
      monsterInfo.push(`(CER ${wm.monster.cer})`);
    } else if (wm.monster.challenge_level) {
      monsterInfo.push(`(${wm.monster.challenge_level})`);
    }
    
    // Add source/page reference if available
    if (wm.monster.reference && wm.monster.reference !== 'Unknown') {
      monsterInfo.push(`[${wm.monster.reference}]`);
    } else if (wm.monster.source && wm.monster.source !== 'Unknown') {
      monsterInfo.push(`[${wm.monster.source}]`);
    }
    
    if (wm.monster.tags && wm.monster.tags.length > 0) {
      monsterInfo.push(`<span class="monster-tags">[${wm.monster.tags.join(', ')}]</span>`);
    }
    
    return `
      <tr>
        <td><strong>${wm.roll}</strong></td>
        <td>${monsterInfo.join(' ')}</td>
        <td><strong>${wm.quantity}</strong></td>
      </tr>
    `;
  }).join('');

  return `
    <section class="wandering-monsters">
      <h3>Wandering Monsters</h3>
      <p><em>Check for wandering monsters once per 10 minutes of real time and on any great noise.</em></p>
      <table class="wandering-monster-table">
        <thead>
          <tr>
            <th>2d6 Roll</th>
            <th>Monster</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </section>
  `;
}

