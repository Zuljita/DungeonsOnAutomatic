import rawMonsters from './monsters-complete.js';

/**
 * Raw monster data structure from monsters-complete.js
 */
export interface RawMonster {
  Description: string;
  Class?: string;
  SM?: number | null;
  Subclass?: string;
  Environment?: string;
  CER?: number;
  Source1?: string;
  [key: string]: any; // Allow for additional properties
}

/**
 * Enhanced DFRPG Monster interface following the design document specifications
 */
export interface DFRPGMonster {
  name: string;
  cer: number; // Challenge Equivalent Rating
  sm: number | null; // Size Modifier
  tags: string[]; // Thematic tags for grouping and filtering
  biome: string[]; // Environment types where this monster appears
  frequency: 'very_rare' | 'rare' | 'uncommon' | 'common' | 'very_common';
  class: string;
  subclass: string;
  source: string;
  // Raw monster data for reference
  raw?: RawMonster;
}

/**
 * Extract thematic tags that are good for creating monster groups
 * Prioritizes tags that define creature race, type, or thematic coherence
 */
function extractThematicTags(rawClass: string, rawSubclass: string): string[] {
  const tags: string[] = [];
  
  // Normalize and add class-based tags
  if (typeof rawClass === 'string' && rawClass.trim()) {
    const className = rawClass.toLowerCase().trim();
    
    // Major creature types that work well for grouping
    if (className.includes('goblin')) tags.push('goblinoid', 'primitive');
    if (className.includes('orc')) tags.push('orcish', 'brutal');
    if (className.includes('undead')) tags.push('undead', 'death');
    if (className.includes('demon')) tags.push('demon', 'evil', 'infernal');
    if (className.includes('elemental')) tags.push('elemental', 'magical');
    if (className.includes('dragon')) tags.push('dragon', 'scaled', 'majestic');
    if (className.includes('animal')) tags.push('animal', 'natural');
    if (className.includes('dire')) tags.push('dire', 'oversized');
    if (className.includes('spirit')) tags.push('spirit', 'incorporeal');
    if (className.includes('construct')) tags.push('construct', 'artificial');
    if (className.includes('plant')) tags.push('plant', 'natural');
    if (className.includes('humanoid')) tags.push('humanoid', 'civilized');
    if (className.includes('mundane')) tags.push('mundane', 'common');
    
    // Add the raw class for exact matching
    tags.push(className.replace(/\s+/g, '_'));
  }
  
  // Add subclass tags for more specific grouping
  if (typeof rawSubclass === 'string' && rawSubclass.trim()) {
    const subclassName = rawSubclass.toLowerCase().trim();
    
    // Elemental subtypes
    if (subclassName.includes('fire')) tags.push('fire', 'burning');
    if (subclassName.includes('water')) tags.push('water', 'aquatic');
    if (subclassName.includes('earth')) tags.push('earth', 'stone');
    if (subclassName.includes('air')) tags.push('air', 'flying');
    if (subclassName.includes('ice')) tags.push('ice', 'cold');
    
    // Undead subtypes
    if (subclassName.includes('skeleton')) tags.push('skeleton', 'bone');
    if (subclassName.includes('zombie')) tags.push('zombie', 'shambling');
    if (subclassName.includes('ghost')) tags.push('ghost', 'ethereal');
    if (subclassName.includes('wraith')) tags.push('wraith', 'shadow');
    if (subclassName.includes('vampire')) tags.push('vampire', 'blood');
    
    // Add the raw subclass
    tags.push(subclassName.replace(/\s+/g, '_'));
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Convert raw monster data to enhanced DFRPGMonster format
 */
export const MONSTERS: DFRPGMonster[] = (rawMonsters as RawMonster[]).map((m) => {
  const cer = typeof m.CER === 'number' ? m.CER : 0;
  const sm = typeof m.SM === 'number' ? m.SM : null;
  const tags = extractThematicTags(m.Class || '', m.Subclass || '');
  
  // Parse biome/environment data
  const biome = typeof m.Environment === 'string' && m.Environment.trim()
    ? m.Environment.split(/,\s*/).map((b: string) => b.toLowerCase().trim()).filter(b => b.length > 0)
    : ['dungeon']; // Default to dungeon if no environment specified
  
  // Calculate frequency based on CER (higher CER = rarer)
  const frequency: DFRPGMonster['frequency'] =
    cer >= 150
      ? 'very_rare'
      : cer >= 100
        ? 'rare'
        : cer >= 50
          ? 'uncommon'
          : cer >= 25
            ? 'common'
            : 'very_common';
  
  return {
    name: m.Description || 'Unknown Monster',
    cer,
    sm,
    tags,
    biome,
    frequency,
    class: m.Class || '',
    subclass: m.Subclass || '',
    source: (typeof m.Source1 === 'string' ? m.Source1 : 'Unknown'),
    raw: m
  };
});

/**
 * Get thematic tags that are good for leader-minion relationships
 * These are the tags most likely to create coherent monster groups
 */
export function getThematicTags(monster: DFRPGMonster): string[] {
  const priorityTags = [
    'goblinoid', 'orcish', 'undead', 'demon', 'elemental', 'dragon',
    'dire', 'spirit', 'construct', 'plant', 'humanoid'
  ];
  
  return monster.tags.filter(tag => priorityTags.includes(tag));
}

export default MONSTERS;
