import { Monster, Trap, Treasure } from '../core/types';

export interface TaggedItem {
  tags?: string[];
  weight?: number; // For weighted selection
}

// Since Monster, Trap, and Treasure already have optional tags, we can use them directly
export type TaggedMonster = Monster;
export type TaggedTrap = Trap;
export type TaggedTreasure = Treasure;

export interface TagCategory {
  id: string;
  name: string;
  description: string;
  color?: string; // For UI display
}

export interface TagTheme {
  id: string;
  name: string;
  description: string;
  primaryTags: string[];
  secondaryTags: string[];
  excludedTags?: string[];
  weight: number; // How strongly this theme influences selection
  systemId?: string; // Which system this theme belongs to
}

export interface TagSelectionOptions {
  requiredTags?: string[];
  preferredTags?: string[];
  excludedTags?: string[];
  theme?: string;
  maxItems?: number;
  allowUntagged?: boolean;
}

/**
 * Comprehensive tag system for thematic dungeon generation
 */
export class TagSystem {
  private static instance: TagSystem;
  
  // Predefined tag categories
  public readonly categories: TagCategory[] = [
    { id: 'environment', name: 'Environment', description: 'Environmental themes', color: '#4CAF50' },
    { id: 'creature', name: 'Creature Type', description: 'Creature classifications', color: '#FF9800' },
    { id: 'magic', name: 'Magic', description: 'Magical themes and elements', color: '#9C27B0' },
    { id: 'culture', name: 'Culture', description: 'Cultural and civilization themes', color: '#2196F3' },
    { id: 'danger', name: 'Danger Level', description: 'Threat and difficulty themes', color: '#F44336' },
    { id: 'loot', name: 'Loot Type', description: 'Treasure and reward themes', color: '#FFD700' },
    { id: 'trap', name: 'Trap Type', description: 'Trap and hazard themes', color: '#795548' },
    { id: 'mood', name: 'Mood', description: 'Atmospheric and emotional themes', color: '#607D8B' }
  ];

  // System-specific themes
  private readonly systemThemes: Record<string, TagTheme[]> = {
    generic: [
      {
        id: 'generic-fantasy',
        name: 'Classic Fantasy',
        description: 'Traditional fantasy dungeon with goblins, orcs, and magical treasures',
        primaryTags: ['fantasy', 'magical', 'adventure'],
        secondaryTags: ['classic', 'traditional', 'heroic'],
        excludedTags: ['modern', 'sci-fi', 'post-apocalyptic'],
        weight: 1.0,
        systemId: 'generic'
      },
      {
        id: 'generic-undead',
        name: 'Undead Crypt',
        description: 'A dark crypt filled with undead creatures and necromantic magic',
        primaryTags: ['undead', 'necromancy', 'dark', 'crypt', 'death'],
        secondaryTags: ['cold', 'silent', 'ancient', 'cursed'],
        excludedTags: ['living', 'bright', 'warm'],
        weight: 1.0,
        systemId: 'generic'
      },
      {
        id: 'generic-nature',
        name: 'Natural Caverns',
        description: 'Natural cave systems with wildlife and natural hazards',
        primaryTags: ['natural', 'wildlife', 'cavern', 'organic'],
        secondaryTags: ['untamed', 'primal', 'earthy', 'living'],
        excludedTags: ['constructed', 'artificial', 'dead'],
        weight: 1.0,
        systemId: 'generic'
      }
    ],
    dfrpg: [
      {
        id: 'dfrpg-undead',
        name: 'Undead Crypt',
        description: 'A dark crypt filled with undead creatures and necromantic magic',
        primaryTags: ['undead', 'necromancy', 'dark', 'crypt', 'death'],
        secondaryTags: ['cold', 'silent', 'ancient', 'cursed'],
        excludedTags: ['living', 'bright', 'warm'],
        weight: 1.0,
        systemId: 'dfrpg'
      },
      {
        id: 'dfrpg-goblin',
        name: 'Goblin Warren',
        description: 'A chaotic warren of goblin tribes with primitive traps and stolen loot',
        primaryTags: ['goblin', 'chaotic', 'primitive', 'tribal'],
        secondaryTags: ['cramped', 'messy', 'improvised', 'stolen'],
        excludedTags: ['orderly', 'refined', 'ancient'],
        weight: 1.0,
        systemId: 'dfrpg'
      },
      {
        id: 'dfrpg-dragon',
        name: 'Dragon Lair',
        description: 'A magnificent dragon\'s lair with valuable treasures and deadly guardians',
        primaryTags: ['dragon', 'treasure', 'fire', 'majestic'],
        secondaryTags: ['wealthy', 'dangerous', 'impressive', 'scaled'],
        excludedTags: ['poor', 'weak', 'small'],
        weight: 1.0,
        systemId: 'dfrpg'
      },
      {
        id: 'dfrpg-elemental',
        name: 'Elemental Plane',
        description: 'A realm of pure elemental energy with elemental creatures and magic',
        primaryTags: ['elemental', 'magical', 'energy', 'pure'],
        secondaryTags: ['unstable', 'powerful', 'otherworldly'],
        excludedTags: ['mundane', 'stable', 'earthly'],
        weight: 1.0,
        systemId: 'dfrpg'
      },
      {
        id: 'dfrpg-abandoned',
        name: 'Abandoned Ruins',
        description: 'Ancient ruins left to decay with forgotten treasures and dangers',
        primaryTags: ['abandoned', 'ancient', 'ruined', 'forgotten'],
        secondaryTags: ['decaying', 'dusty', 'mysterious', 'lost'],
        excludedTags: ['inhabited', 'new', 'maintained'],
        weight: 1.0,
        systemId: 'dfrpg'
      },
      {
        id: 'dfrpg-cult',
        name: 'Evil Cult',
        description: 'A secretive cult performing dark rituals and sacrifices',
        primaryTags: ['cult', 'evil', 'ritual', 'sacrifice'],
        secondaryTags: ['secretive', 'dark', 'corrupted', 'fanatical'],
        excludedTags: ['good', 'open', 'pure'],
        weight: 1.0,
        systemId: 'dfrpg'
      },
      {
        id: 'dfrpg-nature',
        name: 'Natural Caverns',
        description: 'Natural cave systems with wildlife and natural hazards',
        primaryTags: ['natural', 'wildlife', 'cavern', 'organic'],
        secondaryTags: ['untamed', 'primal', 'earthy', 'living'],
        excludedTags: ['constructed', 'artificial', 'dead'],
        weight: 1.0,
        systemId: 'dfrpg'
      },
      {
        id: 'dfrpg-wizard',
        name: 'Wizard\'s Tower',
        description: 'A magical tower filled with arcane experiments and magical guardians',
        primaryTags: ['wizard', 'arcane', 'magical', 'intelligent'],
        secondaryTags: ['experimental', 'guarded', 'enchanted', 'scholarly'],
        excludedTags: ['primitive', 'mindless', 'mundane'],
        weight: 1.0,
        systemId: 'dfrpg'
      }
    ]
  };

  /**
   * Get singleton instance
   */
  public static getInstance(): TagSystem {
    if (!TagSystem.instance) {
      TagSystem.instance = new TagSystem();
    }
    return TagSystem.instance;
  }

  /**
   * Get themes for a specific system
   */
  public getThemesForSystem(systemId: string): TagTheme[] {
    return this.systemThemes[systemId] || [];
  }

  /**
   * Get all themes across all systems
   */
  public getAllThemes(): TagTheme[] {
    return Object.values(this.systemThemes).flat();
  }

  /**
   * Add themes for a system
   */
  public addSystemThemes(systemId: string, themes: TagTheme[]): void {
    if (!this.systemThemes[systemId]) {
      this.systemThemes[systemId] = [];
    }
    this.systemThemes[systemId].push(...themes);
  }

  /**
   * Calculate tag compatibility score between an item and desired tags
   */
  public calculateTagScore(item: TaggedItem, options: TagSelectionOptions): number {
    const itemTags = item.tags || [];
    let score = 0;

    // Required tags must be present
    if (options.requiredTags) {
      for (const requiredTag of options.requiredTags) {
        if (!itemTags.includes(requiredTag)) {
          return 0; // Item doesn't have required tag
        }
        score += 10; // Bonus for required tags
      }
    }

    // Preferred tags give bonus points
    if (options.preferredTags) {
      for (const preferredTag of options.preferredTags) {
        if (itemTags.includes(preferredTag)) {
          score += 5;
        }
      }
    }

    // Excluded tags disqualify the item
    if (options.excludedTags) {
      for (const excludedTag of options.excludedTags) {
        if (itemTags.includes(excludedTag)) {
          return 0; // Item has excluded tag
        }
      }
    }

    // Theme-based scoring
    if (options.theme) {
      const theme = this.getTheme(options.theme);
      if (theme) {
        // Check primary tags
        for (const primaryTag of theme.primaryTags) {
          if (itemTags.includes(primaryTag)) {
            score += 8 * theme.weight;
          }
        }
        // Check secondary tags
        for (const secondaryTag of theme.secondaryTags) {
          if (itemTags.includes(secondaryTag)) {
            score += 3 * theme.weight;
          }
        }
        // Check excluded tags
        if (theme.excludedTags) {
          for (const excludedTag of theme.excludedTags) {
            if (itemTags.includes(excludedTag)) {
              return 0; // Item has theme-excluded tag
            }
          }
        }
      }
    }

    // Bonus for items with more matching tags
    score += itemTags.length * 0.5;

    return score;
  }

  /**
   * Select items based on tag criteria
   */
  public selectByTags<T extends TaggedItem>(
    items: T[],
    options: TagSelectionOptions
  ): T[] {
    const scoredItems = items
      .map(item => ({
        item,
        score: this.calculateTagScore(item, options)
      }))
      .filter(({ score }) => score > 0 || options.allowUntagged)
      .sort((a, b) => b.score - a.score);

    const maxItems = options.maxItems || scoredItems.length;
    return scoredItems.slice(0, maxItems).map(({ item }) => item);
  }

  /**
   * Get all available tags from a collection of items
   */
  public getAllTags<T extends TaggedItem>(items: T[]): string[] {
    const tagSet = new Set<string>();
    items.forEach(item => {
      if (item.tags) {
        item.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }

  /**
   * Get tags by category
   */
  public getTagsByCategory<T extends TaggedItem>(
    items: T[],
    categoryId: string
  ): string[] {
    // This is a simplified implementation - in a real system,
    // you might have more sophisticated category mapping
    const allTags = this.getAllTags(items);
    return allTags.filter(tag => {
      const category = this.categories.find(c => c.id === categoryId);
      return category && tag.toLowerCase().includes(category.name.toLowerCase());
    });
  }

  /**
   * Suggest tags based on existing tags
   */
  public suggestTags(currentTags: string[], systemId?: string): string[] {
    const suggestions: string[] = [];
    const themes = systemId ? this.getThemesForSystem(systemId) : this.getAllThemes();
    
    // Find themes that match current tags
    for (const theme of themes) {
      const matchingPrimary = theme.primaryTags.filter(tag => 
        currentTags.includes(tag)
      );
      const matchingSecondary = theme.secondaryTags.filter(tag => 
        currentTags.includes(tag)
      );
      
      if (matchingPrimary.length > 0 || matchingSecondary.length > 0) {
        // Suggest other tags from the same theme
        const themeTags = [...theme.primaryTags, ...theme.secondaryTags];
        const missingTags = themeTags.filter(tag => !currentTags.includes(tag));
        suggestions.push(...missingTags);
      }
    }
    
    return [...new Set(suggestions)].slice(0, 10); // Limit to 10 suggestions
  }

  /**
   * Get theme by ID
   */
  public getTheme(themeId: string): TagTheme | undefined {
    const allThemes = this.getAllThemes();
    return allThemes.find(theme => theme.id === themeId);
  }

  /**
   * Get category by ID
   */
  public getCategory(categoryId: string): TagCategory | undefined {
    return this.categories.find(category => category.id === categoryId);
  }

  /**
   * Get all available categories
   */
  public getCategories(): TagCategory[] {
    return this.categories;
  }
}

// Export singleton instance
export const tagSystem = TagSystem.getInstance();
