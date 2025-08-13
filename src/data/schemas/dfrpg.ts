import { ModuleSchema } from './types';

export const dfrpgSchema: ModuleSchema = {
  id: 'dfrpg',
  label: 'GURPS Dungeon Fantasy RPG',
  description: 'Extended data structures for GURPS Dungeon Fantasy RPG system',
  dataTypes: {
    monsters: {
      name: 'Monsters',
      fileName: 'dfrpg-monsters-template.csv',
      description: 'DFRPG monster definitions with detailed GURPS stats',
      fields: [
        { name: 'Description', type: 'string', required: true, description: 'Monster name/description' },
        { name: 'Class', type: 'string', required: false, description: 'Monster class (e.g., Mundane, Elemental)' },
        { name: 'SM', type: 'number', required: false, description: 'Size Modifier' },
        { name: 'Subclass', type: 'string', required: false, description: 'Monster subclass' },
        { name: 'Source1', type: 'string', required: false, description: 'Primary source book' },
        { name: 'hit_points', type: 'number', required: false, description: 'Hit Points' },
        { name: 'armor_class', type: 'number', required: false, description: 'Damage Resistance' },
        { name: 'attack_bonus', type: 'string', required: false, description: 'Attack skill level' },
        { name: 'damage_dice', type: 'string', required: false, description: 'Damage dice (e.g., 2d6+1)' },
        { name: 'frequency', type: 'enum', required: false, description: 'Encounter frequency', enumValues: ['very_rare', 'rare', 'uncommon', 'common', 'very_common'] },
        { name: 'special_ability', type: 'string', required: false, description: 'Special abilities or traits' }
      ],
      examples: [
        ['Goblin Warrior', 'Mundane', '-2', 'Goblinoid', 'DFRPG', '8', '2', '12', '1d6-1', 'common', 'Sneaky, pack tactics'],
        ['Skeleton Guardian', 'Undead', '0', 'Animated', 'DFRPG', '12', '4', '14', '1d6+1', 'uncommon', 'Immune to mind control, DR vs piercing'],
        ['Fire Elemental', 'Elemental', '1', 'Fire', 'DFRPG', '20', '0', '16', '2d6 burn', 'rare', 'Burning touch, immune to fire']
      ]
    },
    traps: {
      name: 'Traps',
      fileName: 'dfrpg-traps-template.csv',
      description: 'DFRPG trap definitions with GURPS mechanics',
      fields: [
        { name: 'name', type: 'string', required: true, description: 'Trap name' },
        { name: 'level', type: 'number', required: false, description: 'Trap complexity level (1-10)' },
        { name: 'trigger', type: 'string', required: false, description: 'How the trap is triggered' },
        { name: 'effect', type: 'string', required: false, description: 'Trap effect and damage' },
        { name: 'detection_difficulty', type: 'number', required: false, description: 'Perception roll difficulty' },
        { name: 'disarm_difficulty', type: 'number', required: false, description: 'Traps skill roll difficulty' },
        { name: 'reset_time', type: 'string', required: false, description: 'Time to reset (if applicable)' },
        { name: 'notes', type: 'string', required: false, description: 'Additional mechanics and flavor' }
      ],
      examples: [
        ['Poisoned Needle', '2', 'Opening container', '1d-3 injury + HT-2 vs poison', '14', '12', 'Manual', 'Hidden in lock mechanism'],
        ['Crushing Walls', '6', 'Pressure plate', '3d crushing per second', '12', '16', 'Never', 'Walls close over 3 seconds'],
        ['Magical Glyph', '4', 'Touch or dispel', '2d+2 burning', '16', '15', 'Instant', 'Requires Thaumatology to understand']
      ]
    },
    doors: {
      name: 'Doors',
      fileName: 'dfrpg-doors-template.csv',
      description: 'DFRPG door types with GURPS stats',
      fields: [
        { name: 'type', type: 'enum', required: true, description: 'Door type', enumValues: ['normal', 'arch', 'portcullis', 'hole'] },
        { name: 'status', type: 'enum', required: true, description: 'Door condition', enumValues: ['locked', 'trapped', 'barred', 'jammed', 'warded', 'secret'] },
        { name: 'material', type: 'string', required: false, description: 'Construction material' },
        { name: 'hp', type: 'number', required: false, description: 'Hit Points' },
        { name: 'dr', type: 'number', required: false, description: 'Damage Resistance' },
        { name: 'lock_quality', type: 'enum', required: false, description: 'Lock difficulty', enumValues: ['cheap', 'good', 'fine', 'magical'] },
        { name: 'forced_entry_difficulty', type: 'number', required: false, description: 'ST roll to break down' },
        { name: 'notes', type: 'string', required: false, description: 'Special properties and mechanics' }
      ],
      examples: [
        ['normal', 'locked', 'Oak wood', '20', '2', 'good', '16', 'Standard wooden door with iron lock'],
        ['portcullis', 'barred', 'Iron', '40', '8', '', '20', 'Heavy iron grating, requires winch to operate'],
        ['arch', 'warded', 'Stone', '80', '10', 'magical', '25', 'Magical ward requires Dispel Magic or key phrase']
      ]
    },
    decorations: {
      name: 'Room Features',
      fileName: 'dfrpg-decorations-template.csv',
      description: 'DFRPG room features and decorations',
      fields: [
        { name: 'name', type: 'string', required: true, description: 'Feature name' },
        { name: 'type', type: 'enum', required: false, description: 'Feature category', enumValues: ['furniture', 'decoration', 'structure', 'treasure', 'hazard', 'magical'] },
        { name: 'weight', type: 'number', required: false, description: 'Random selection weight (1-10)', defaultValue: 1 },
        { name: 'value', type: 'string', required: false, description: 'Monetary value (e.g., $50, $200)' },
        { name: 'magical', type: 'boolean', required: false, description: 'Has magical properties', defaultValue: false },
        { name: 'interaction', type: 'string', required: false, description: 'How characters can interact with it' },
        { name: 'description', type: 'string', required: false, description: 'Detailed description and effects' }
      ],
      examples: [
        ['Ancient Tapestry', 'decoration', '3', '$100', 'false', 'Examine for historical clues', 'Depicts a long-lost battle, may contain historical information'],
        ['Enchanted Brazier', 'magical', '1', '$500', 'true', 'Light with Ignite Fire spell', 'Provides magical light and warmth when activated'],
        ['Collapsed Bookshelf', 'furniture', '4', '$20', 'false', 'Search for surviving books', 'Most books destroyed, but may contain valuable tomes']
      ]
    }
  }
};