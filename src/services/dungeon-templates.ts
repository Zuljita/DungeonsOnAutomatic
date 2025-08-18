import type { MapGenerationOptions } from './map-generator';
import type { DungeonDefaults } from '../core/types';

export interface DungeonTemplate {
  id: string;
  name: string;
  description: string;
  category: 'classic' | 'natural' | 'fortress' | 'maze' | 'special';
  thumbnail?: string; // Future: could be a small ASCII preview
  
  // Map generation settings
  mapOptions: Partial<MapGenerationOptions>;
  
  // Suggested system and tags
  recommendedSystem?: string;
  suggestedTags?: {
    theme?: string;
    monsters?: string[];
    traps?: string[];
    treasure?: string[];
  };
  
  // Predefined defaults (optional)
  defaults?: Partial<DungeonDefaults>;
}

export const DUNGEON_TEMPLATES: DungeonTemplate[] = [
  // Classic Templates
  {
    id: 'classic-small',
    name: 'Small Classic Dungeon',
    description: 'A traditional 5-8 room dungeon perfect for new adventurers',
    category: 'classic',
    mapOptions: {
      rooms: 6,
      width: 40,
      height: 30,
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'small',
      roomShape: 'rectangular',
      corridorType: 'straight',
      corridorWidth: 1,
      allowDeadends: true
    },
    recommendedSystem: 'dfrpg',
    suggestedTags: {
      theme: 'generic-undead',
      monsters: ['undead'],
      traps: ['mechanical'],
      treasure: ['coins']
    },
    defaults: {
      manaLevel: 'normal',
      sanctity: 'neutral',
      nature: 'weak'
    }
  },
  
  {
    id: 'classic-large',
    name: 'Large Classic Dungeon',
    description: 'An extensive dungeon complex with multiple chambers and secrets',
    category: 'classic',
    mapOptions: {
      rooms: 15,
      width: 80,
      height: 60,
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'mixed',
      roomShape: 'mixed',
      corridorType: 'winding',
      corridorWidth: 1,
      allowDeadends: true,
      stairsDown: true
    },
    recommendedSystem: 'dfrpg',
    suggestedTags: {
      monsters: ['humanoid', 'undead'],
      traps: ['mechanical', 'magical'],
      treasure: ['coins', 'gems']
    }
  },

  // Natural Templates
  {
    id: 'natural-cave',
    name: 'Natural Cave System',
    description: 'Winding caverns carved by water and time, home to natural creatures',
    category: 'natural',
    mapOptions: {
      rooms: 8,
      width: 60,
      height: 50,
      layoutType: 'cavernous',
      roomLayout: 'sparse',
      roomSize: 'large',
      roomShape: 'circular-preference',
      corridorType: 'winding',
      corridorWidth: 2,
      allowDeadends: true
    },
    recommendedSystem: 'dfrpg',
    suggestedTags: {
      monsters: ['beast', 'elemental'],
      traps: ['natural'],
      treasure: ['gems', 'natural']
    },
    defaults: {
      manaLevel: 'normal',
      sanctity: 'neutral',
      nature: 'strong'
    }
  },

  {
    id: 'underground-river',
    name: 'Underground River Complex',
    description: 'Caverns connected by an underground waterway with unique challenges',
    category: 'natural',
    mapOptions: {
      rooms: 12,
      width: 70,
      height: 40,
      layoutType: 'dagger',
      roomLayout: 'scattered',
      roomSize: 'mixed',
      roomShape: 'diverse',
      corridorType: 'winding',
      corridorWidth: 3, // Wide for river
      allowDeadends: false
    },
    recommendedSystem: 'dfrpg',
    suggestedTags: {
      monsters: ['aquatic', 'beast'],
      traps: ['water', 'natural'],
      treasure: ['gems', 'magical']
    },
    defaults: {
      manaLevel: 'high',
      sanctity: 'neutral',
      nature: 'primal'
    }
  },

  // Fortress Templates
  {
    id: 'ancient-keep',
    name: 'Ancient Keep',
    description: 'A fortified stronghold with defensive chambers and strategic layout',
    category: 'fortress',
    mapOptions: {
      rooms: 10,
      width: 50,
      height: 50,
      layoutType: 'keep',
      roomLayout: 'symmetric',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      corridorWidth: 2,
      allowDeadends: false,
      stairsUp: true,
      stairsDown: true
    },
    recommendedSystem: 'dfrpg',
    suggestedTags: {
      monsters: ['humanoid', 'construct'],
      traps: ['mechanical', 'magical'],
      treasure: ['coins', 'weapons']
    },
    defaults: {
      manaLevel: 'low',
      sanctity: 'neutral',
      nature: 'dead'
    }
  },

  {
    id: 'wizard-tower',
    name: 'Wizard\'s Tower',
    description: 'A mystical tower with magical chambers and arcane defenses',
    category: 'fortress',
    mapOptions: {
      rooms: 8,
      width: 30,
      height: 60,
      layoutType: 'cross',
      roomLayout: 'symmetric',
      roomSize: 'small',
      roomShape: 'hex-preference',
      corridorType: 'straight',
      corridorWidth: 1,
      allowDeadends: true,
      stairsUp: true,
      stairsDown: true
    },
    recommendedSystem: 'dfrpg',
    suggestedTags: {
      monsters: ['magical', 'construct'],
      traps: ['magical', 'illusion'],
      treasure: ['magical', 'knowledge']
    },
    defaults: {
      manaLevel: 'very_high',
      sanctity: 'neutral',
      nature: 'dead'
    }
  },

  // Maze Templates
  {
    id: 'labyrinth',
    name: 'The Labyrinth',
    description: 'A twisting maze designed to confuse and trap intruders',
    category: 'maze',
    mapOptions: {
      rooms: 20,
      width: 80,
      height: 80,
      layoutType: 'rectangle',
      roomLayout: 'dense',
      roomSize: 'small',
      roomShape: 'rectangular',
      corridorType: 'maze',
      corridorWidth: 1,
      allowDeadends: true
    },
    recommendedSystem: 'dfrpg',
    suggestedTags: {
      monsters: ['construct', 'magical'],
      traps: ['magical', 'mechanical'],
      treasure: ['magical', 'gems']
    },
    defaults: {
      manaLevel: 'high',
      sanctity: 'neutral',
      nature: 'dead'
    }
  },

  {
    id: 'minotaur-maze',
    name: 'Minotaur\'s Domain',
    description: 'A beast\'s hunting ground with winding passages and hidden chambers',
    category: 'maze',
    mapOptions: {
      rooms: 12,
      width: 60,
      height: 60,
      layoutType: 'square',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'mixed',
      corridorType: 'maze',
      corridorWidth: 2,
      allowDeadends: true
    },
    recommendedSystem: 'dfrpg',
    suggestedTags: {
      monsters: ['beast', 'magical'],
      traps: ['natural', 'mechanical'],
      treasure: ['bones', 'trophies']
    },
    defaults: {
      manaLevel: 'normal',
      sanctity: 'defiled',
      nature: 'weak'
    }
  },

  // Special Templates
  {
    id: 'temple-ruins',
    name: 'Ruined Temple',
    description: 'Ancient sacred grounds now fallen to decay and corruption',
    category: 'special',
    mapOptions: {
      rooms: 9,
      width: 50,
      height: 40,
      layoutType: 'cross',
      roomLayout: 'symmetric',
      roomSize: 'large',
      roomShape: 'hex-preference',
      corridorType: 'straight',
      corridorWidth: 2,
      allowDeadends: false,
      entranceFromPeriphery: true
    },
    recommendedSystem: 'dfrpg',
    suggestedTags: {
      theme: 'generic-undead',
      monsters: ['undead', 'spirit'],
      traps: ['holy', 'curse'],
      treasure: ['holy', 'coins']
    },
    defaults: {
      manaLevel: 'high',
      sanctity: 'cursed',
      nature: 'weak'
    }
  },

  {
    id: 'crystal-caverns',
    name: 'Crystal Caverns',
    description: 'Magical crystal formations create a beautiful but dangerous environment',
    category: 'special',
    mapOptions: {
      rooms: 7,
      width: 60,
      height: 60,
      layoutType: 'hexagon',
      roomLayout: 'scattered', // Changed from sparse - hexagon boundaries are small
      roomSize: 'medium', // Changed from large to fit better in hexagon boundaries
      roomShape: 'diverse',
      corridorType: 'winding',
      corridorWidth: 1,
      allowDeadends: true
    },
    recommendedSystem: 'dfrpg',
    suggestedTags: {
      monsters: ['elemental', 'magical'],
      traps: ['magical', 'crystal'],
      treasure: ['gems', 'magical']
    },
    defaults: {
      manaLevel: 'very_high',
      sanctity: 'neutral',
      nature: 'strong'
    }
  },

  {
    id: 'prison-complex',
    name: 'Abandoned Prison',
    description: 'A former detention facility with cells, guard posts, and dark secrets',
    category: 'special',
    mapOptions: {
      rooms: 16,
      width: 70,
      height: 50,
      layoutType: 'box',
      roomLayout: 'dense',
      roomSize: 'small',
      roomShape: 'rectangular',
      corridorType: 'straight',
      corridorWidth: 2,
      allowDeadends: false,
      stairsDown: true
    },
    recommendedSystem: 'dfrpg',
    suggestedTags: {
      monsters: ['undead', 'spirit'],
      traps: ['mechanical', 'torture'],
      treasure: ['contraband', 'keys']
    },
    defaults: {
      manaLevel: 'low',
      sanctity: 'defiled',
      nature: 'dead'
    }
  }
];

/**
 * Service for managing dungeon templates and applying them to generation
 */
export class DungeonTemplateService {
  /**
   * Get all available templates
   */
  getAllTemplates(): DungeonTemplate[] {
    return [...DUNGEON_TEMPLATES];
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: DungeonTemplate['category']): DungeonTemplate[] {
    return DUNGEON_TEMPLATES.filter(template => template.category === category);
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(id: string): DungeonTemplate | undefined {
    return DUNGEON_TEMPLATES.find(template => template.id === id);
  }

  /**
   * Get all available categories
   */
  getCategories(): Array<{ id: DungeonTemplate['category']; name: string; description: string }> {
    return [
      { id: 'classic', name: 'Classic Dungeons', description: 'Traditional dungeon layouts and encounters' },
      { id: 'natural', name: 'Natural Formations', description: 'Caves, caverns, and natural underground spaces' },
      { id: 'fortress', name: 'Fortifications', description: 'Keeps, towers, and defensive structures' },
      { id: 'maze', name: 'Mazes & Labyrinths', description: 'Complex passages designed to confuse' },
      { id: 'special', name: 'Special Locations', description: 'Unique environments with special properties' }
    ];
  }

  /**
   * Apply a template to create generation options
   */
  applyTemplate(template: DungeonTemplate, overrides: Partial<MapGenerationOptions> = {}): MapGenerationOptions {
    // Merge template options with overrides
    const mapOptions: MapGenerationOptions = {
      // Default values
      rooms: 8,
      width: 50,
      height: 50,
      layoutType: 'rectangle',
      roomLayout: 'scattered',
      roomSize: 'medium',
      roomShape: 'rectangular',
      corridorType: 'straight',
      corridorWidth: 1,
      allowDeadends: true,
      stairsUp: false,
      stairsDown: false,
      entranceFromPeriphery: false,
      
      // Apply template settings
      ...template.mapOptions,
      
      // Apply any overrides
      ...overrides
    };

    return mapOptions;
  }

  /**
   * Get smart defaults for a template
   */
  getTemplateDefaults(template: DungeonTemplate): DungeonDefaults | undefined {
    if (!template.defaults) return undefined;
    
    return {
      name: `Template: ${template.name}`,
      manaLevel: 'normal',
      sanctity: 'neutral',
      nature: 'normal',
      ...template.defaults
    };
  }

  /**
   * Search templates by name or description
   */
  searchTemplates(query: string): DungeonTemplate[] {
    const lowerQuery = query.toLowerCase();
    return DUNGEON_TEMPLATES.filter(template => 
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery)
    );
  }
}

// Export singleton instance
export const dungeonTemplateService = new DungeonTemplateService();