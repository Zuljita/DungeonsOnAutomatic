import type { SystemPlugin, Dungeon, GenerationConfig } from '@src/core/plugin-types';

/**
 * DFRPG System Plugin - Basic implementation for desktop testing
 * This is a simplified version that will later be connected to the full DFRPG module
 */
export const dfrpgSystem: SystemPlugin = {
  metadata: {
    id: 'dfrpg',
    name: 'DFRPG System',
    version: '1.0.0',
    description: 'GURPS Dungeon Fantasy RPG system with monsters, traps, and treasure',
    type: 'system',
  },

  /**
   * Initialize the system (optional)
   */
  async initialize(config?: any): Promise<void> {
    console.log('DFRPG System initialized', config);
  },

  /**
   * Enrich a dungeon with DFRPG-specific content
   */
  async enrich(dungeon: Dungeon, config: GenerationConfig): Promise<Dungeon> {
    console.log('Enriching dungeon with DFRPG content...', {
      rooms: dungeon.rooms.length,
      system: config.system,
    });

    // Create enriched copy
    const enriched = { ...dungeon };
    
    // Add basic DFRPG content to each room
    enriched.rooms = dungeon.rooms.map(room => ({
      ...room,
      // Add some basic encounters for testing
      encounters: room.encounters || [],
      treasure: room.treasure || [],
      // Add DFRPG-specific room details
      lighting: 'Torchlight',
      ceiling: 'Stone vaulted, 12 feet high',
      environment: {
        mana: 'Normal',
        sanctity: 'Neutral',
        temperature: 'Cool and damp',
      },
      // Add a simple monster for demonstration
      monsters: room.monsters || [
        {
          id: `monster-${room.id}`,
          name: 'Skeleton Warrior',
          type: 'undead',
          challenge: 'Easy',
          description: 'A restless skeleton guards this chamber',
          stats: {
            ST: 12,
            DX: 11,
            IQ: 8,
            HT: 11,
            HP: 12,
            Will: 8,
            Per: 10,
          },
          tags: ['undead', 'skeleton', 'warrior'],
        },
      ],
    }));

    // Add wandering monsters table
    enriched.wanderingMonsters = [
      { roll: '3-5', monster: 'Giant Rat', frequency: 'Common' },
      { roll: '6-8', monster: 'Skeleton', frequency: 'Common' },
      { roll: '9-11', monster: 'Orc Warrior', frequency: 'Uncommon' },
      { roll: '12-14', monster: 'Zombie', frequency: 'Uncommon' },
      { roll: '15-17', monster: 'Dire Wolf', frequency: 'Rare' },
      { roll: '18', monster: 'Troll', frequency: 'Very Rare' },
    ];

    console.log('DFRPG enrichment complete');
    return enriched;
  },

  /**
   * Get available themes for this system
   */
  getThemes(): string[] {
    return [
      'dungeon',
      'undead',
      'wilderness',
      'urban',
      'elemental',
      'demonic',
      'fey',
    ];
  },

  /**
   * Get default configuration for this system
   */
  getDefaultConfig(): Partial<GenerationConfig> {
    return {
      system: 'dfrpg',
      lockPercentage: 0.2,
      magicalLocks: true,
    };
  },

  /**
   * Cleanup (optional)
   */
  async cleanup(): Promise<void> {
    console.log('DFRPG System cleanup');
  },
};

export default dfrpgSystem;