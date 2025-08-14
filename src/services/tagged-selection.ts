import { Monster, Trap, Treasure, Dungeon } from '../core/types';
import { tagSystem, TagSelectionOptions } from './tag-system';
import { customDataLoader } from './custom-data-loader';

export interface TaggedSelectionOptions {
  // Global theme for the entire dungeon
  theme?: string;
  
  // Room-specific tag options
  roomTags?: {
    required?: string[];
    preferred?: string[];
    excluded?: string[];
  };
  
  // Monster selection options
  monsters?: {
    requiredTags?: string[];
    preferredTags?: string[];
    excludedTags?: string[];
    maxPerRoom?: number;
    allowUntagged?: boolean;
  };
  
  // Trap selection options
  traps?: {
    requiredTags?: string[];
    preferredTags?: string[];
    excludedTags?: string[];
    maxPerRoom?: number;
    allowUntagged?: boolean;
  };
  
  // Treasure selection options
  treasure?: {
    requiredTags?: string[];
    preferredTags?: string[];
    excludedTags?: string[];
    maxPerRoom?: number;
    allowUntagged?: boolean;
  };
}

export interface TaggedDungeonOptions {
  rooms: number;
  seed?: string;
  system: string;
  tags?: TaggedSelectionOptions;
}

/**
 * Service for tag-based selection of dungeon elements
 */
export class TaggedSelectionService {
  /**
   * Select monsters based on tag criteria
   */
  public selectMonsters(
    moduleId: string,
    options: TaggedSelectionOptions,
    rng: () => number
  ): Monster[] {
    // Get available monsters (custom or default)
    let availableMonsters: Monster[] = [];
    
    if (customDataLoader.hasCustomData(moduleId, 'monsters')) {
      availableMonsters = customDataLoader.getMonsters(moduleId);
    } else {
      // Use default monsters based on module
      availableMonsters = this.getDefaultMonsters(moduleId);
    }

    // Apply tag-based selection
    const tagOptions: TagSelectionOptions = {
      requiredTags: options.monsters?.requiredTags,
      preferredTags: options.monsters?.preferredTags,
      excludedTags: options.monsters?.excludedTags,
      theme: options.theme,
      maxItems: options.monsters?.maxPerRoom || 3,
      allowUntagged: options.monsters?.allowUntagged || false
    };

    const selectedMonsters = tagSystem.selectByTags(availableMonsters as any[], tagOptions);
    
    // Randomly select from the top-scoring monsters
    const monsterCount = Math.floor(rng() * (options.monsters?.maxPerRoom || 3));
    const shuffled = this.shuffleArray([...selectedMonsters], rng);
    return shuffled.slice(0, monsterCount) as Monster[];
  }

  /**
   * Select traps based on tag criteria
   */
  public selectTraps(
    moduleId: string,
    options: TaggedSelectionOptions,
    rng: () => number
  ): Trap[] {
    // Get available traps (custom or default)
    let availableTraps: Trap[] = [];
    
    if (customDataLoader.hasCustomData(moduleId, 'traps')) {
      availableTraps = customDataLoader.getTraps(moduleId);
    } else {
      // Use default traps based on module
      availableTraps = this.getDefaultTraps(moduleId);
    }

    // Apply tag-based selection
    const tagOptions: TagSelectionOptions = {
      requiredTags: options.traps?.requiredTags,
      preferredTags: options.traps?.preferredTags,
      excludedTags: options.traps?.excludedTags,
      theme: options.theme,
      maxItems: options.traps?.maxPerRoom || 2,
      allowUntagged: options.traps?.allowUntagged || false
    };

    const selectedTraps = tagSystem.selectByTags(availableTraps as any[], tagOptions);
    
    // Randomly select based on trap probability
    const traps: Trap[] = [];
    if (rng() < 0.3) { // 30% chance of trap
      const trapCount = Math.floor(rng() * (options.traps?.maxPerRoom || 2)) + 1;
      const shuffled = this.shuffleArray([...selectedTraps], rng);
      traps.push(...shuffled.slice(0, trapCount) as Trap[]);
    }
    
    return traps;
  }

  /**
   * Select treasure based on tag criteria
   */
  public selectTreasure(
    moduleId: string,
    options: TaggedSelectionOptions,
    hasMonsters: boolean,
    rng: () => number
  ): Treasure[] {
    // Get available treasure (custom or default)
    let availableTreasure: Treasure[] = [];
    
    if (customDataLoader.hasCustomData(moduleId, 'treasure')) {
      availableTreasure = customDataLoader.getTreasure(moduleId);
    } else {
      // Use default treasure based on module
      availableTreasure = this.getDefaultTreasure(moduleId);
    }

    // Apply tag-based selection
    const tagOptions: TagSelectionOptions = {
      requiredTags: options.treasure?.requiredTags,
      preferredTags: options.treasure?.preferredTags,
      excludedTags: options.treasure?.excludedTags,
      theme: options.theme,
      maxItems: options.treasure?.maxPerRoom || 3,
      allowUntagged: options.treasure?.allowUntagged || false
    };

    const selectedTreasure = tagSystem.selectByTags(availableTreasure as any[], tagOptions);
    
    // Randomly select based on treasure probability
    const treasure: Treasure[] = [];
    const treasureChance = hasMonsters ? 0.7 : 0.4; // Higher chance if monsters present
    
    if (rng() < treasureChance) {
      const treasureCount = Math.floor(rng() * (options.treasure?.maxPerRoom || 3)) + 1;
      const shuffled = this.shuffleArray([...selectedTreasure], rng);
      treasure.push(...shuffled.slice(0, treasureCount) as Treasure[]);
    }
    
    return treasure;
  }

  /**
   * Apply room tags based on theme and options
   */
  public applyRoomTags(
    room: any,
    options: TaggedSelectionOptions,
    rng: () => number
  ): void {
    if (!options.theme) return;

    const theme = tagSystem.getTheme(options.theme);
    if (!theme) return;

    // Apply theme-based room tags
    const roomTags: string[] = [];
    
    // Add primary theme tags
    roomTags.push(...theme.primaryTags);
    
    // Add some secondary theme tags randomly
    for (const secondaryTag of theme.secondaryTags) {
      if (rng() < 0.3) { // 30% chance per secondary tag
        roomTags.push(secondaryTag);
      }
    }
    
    // Add room-specific tags if provided
    if (options.roomTags?.required) {
      roomTags.push(...options.roomTags.required);
    }
    if (options.roomTags?.preferred) {
      for (const preferredTag of options.roomTags.preferred) {
        if (rng() < 0.5) { // 50% chance per preferred tag
          roomTags.push(preferredTag);
        }
      }
    }
    
    // Remove duplicates and excluded tags
    const uniqueTags = [...new Set(roomTags)];
    const finalTags = uniqueTags.filter(tag => 
      !options.roomTags?.excluded?.includes(tag)
    );
    
    room.tags = finalTags;
  }

  /**
   * Get default monsters for a module
   */
  private getDefaultMonsters(moduleId: string): Monster[] {
    switch (moduleId) {
      case 'dfrpg':
        return [
          { name: 'Goblin', cls: 'Humanoid', subclass: 'Goblinoid', tags: ['goblin', 'humanoid', 'chaotic', 'primitive'] },
          { name: 'Skeleton', cls: 'Undead', subclass: 'Animated', tags: ['undead', 'skeleton', 'mindless', 'cold'] },
          { name: 'Orc', cls: 'Humanoid', subclass: 'Orcish', tags: ['orc', 'humanoid', 'brutal', 'savage'] },
          { name: 'Dragon', cls: 'Dragon', subclass: 'True Dragon', tags: ['dragon', 'scaled', 'majestic', 'fire', 'treasure'] },
          { name: 'Fire Elemental', cls: 'Elemental', subclass: 'Fire', tags: ['elemental', 'fire', 'magical', 'energy'] },
          { name: 'Cultist', cls: 'Humanoid', subclass: 'Human', tags: ['human', 'cult', 'evil', 'fanatical'] },
          { name: 'Wizard', cls: 'Humanoid', subclass: 'Human', tags: ['human', 'wizard', 'arcane', 'intelligent'] },
          { name: 'Wild Animal', cls: 'Animal', subclass: 'Beast', tags: ['animal', 'wildlife', 'natural', 'primal'] }
        ];
      case 'generic':
      default:
        return [
          { name: 'Goblin', cls: 'Humanoid', tags: ['goblin', 'humanoid', 'chaotic'] },
          { name: 'Skeleton', cls: 'Undead', tags: ['undead', 'skeleton', 'cold'] },
          { name: 'Orc', cls: 'Humanoid', tags: ['orc', 'humanoid', 'brutal'] },
          { name: 'Dragon', cls: 'Dragon', tags: ['dragon', 'scaled', 'majestic'] },
          { name: 'Elemental', cls: 'Elemental', tags: ['elemental', 'magical', 'energy'] },
          { name: 'Cultist', cls: 'Humanoid', tags: ['human', 'cult', 'evil'] },
          { name: 'Wizard', cls: 'Humanoid', tags: ['human', 'wizard', 'arcane'] },
          { name: 'Animal', cls: 'Animal', tags: ['animal', 'wildlife', 'natural'] }
        ];
    }
  }

  /**
   * Get default traps for a module
   */
  private getDefaultTraps(moduleId: string): Trap[] {
    switch (moduleId) {
      case 'dfrpg':
        return [
          { name: 'Pit Trap', level: 1, category: 'mechanical', tags: ['mechanical', 'pit', 'falling', 'primitive'] },
          { name: 'Arrow Trap', level: 2, category: 'mechanical', tags: ['mechanical', 'projectile', 'piercing'] },
          { name: 'Poison Gas', level: 3, category: 'alchemical', tags: ['alchemical', 'poison', 'gas', 'toxic'] },
          { name: 'Fireball Glyph', level: 4, category: 'magical', tags: ['magical', 'fire', 'explosive', 'arcane'] },
          { name: 'Collapsing Ceiling', level: 3, category: 'mechanical', tags: ['mechanical', 'crushing', 'structural'] },
          { name: 'Mind Control Rune', level: 5, category: 'magical', tags: ['magical', 'mental', 'control', 'arcane'] },
          { name: 'Acid Spray', level: 3, category: 'alchemical', tags: ['alchemical', 'acid', 'corrosive', 'chemical'] },
          { name: 'Summoning Circle', level: 6, category: 'magical', tags: ['magical', 'summoning', 'ritual', 'arcane'] }
        ];
      case 'generic':
      default:
        return [
          { name: 'Pit Trap', level: 1, tags: ['mechanical', 'pit', 'falling'] },
          { name: 'Arrow Trap', level: 2, tags: ['mechanical', 'projectile'] },
          { name: 'Poison Gas', level: 3, tags: ['alchemical', 'poison', 'gas'] },
          { name: 'Fire Trap', level: 4, tags: ['magical', 'fire', 'explosive'] },
          { name: 'Collapsing Ceiling', level: 3, tags: ['mechanical', 'crushing'] },
          { name: 'Mind Trap', level: 5, tags: ['magical', 'mental', 'control'] }
        ];
    }
  }

  /**
   * Get default treasure for a module
   */
  private getDefaultTreasure(moduleId: string): Treasure[] {
    switch (moduleId) {
      case 'dfrpg':
        return [
          { kind: 'coins', valueHint: 'minor', tags: ['coins', 'mundane', 'currency'] },
          { kind: 'gems', valueHint: 'standard', tags: ['gems', 'precious', 'sparkling'] },
          { kind: 'art', valueHint: 'minor', tags: ['art', 'decorative', 'cultural'] },
          { kind: 'magic', valueHint: 'major', tags: ['magic', 'enchanted', 'powerful', 'arcane'] },
          { kind: 'gear', valueHint: 'standard', tags: ['gear', 'equipment', 'useful'] },
          { kind: 'other', valueHint: 'minor', tags: ['other', 'miscellaneous', 'curious'] }
        ];
      case 'generic':
      default:
        return [
          { kind: 'coins', valueHint: 'minor', tags: ['coins', 'mundane'] },
          { kind: 'gems', valueHint: 'standard', tags: ['gems', 'precious'] },
          { kind: 'art', valueHint: 'minor', tags: ['art', 'decorative'] },
          { kind: 'magic', valueHint: 'major', tags: ['magic', 'enchanted'] },
          { kind: 'gear', valueHint: 'standard', tags: ['gear', 'equipment'] }
        ];
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[], rng: () => number): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Export singleton instance
export const taggedSelectionService = new TaggedSelectionService();
