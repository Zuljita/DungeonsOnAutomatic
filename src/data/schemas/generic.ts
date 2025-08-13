import { ModuleSchema } from './types';

export const genericSchema: ModuleSchema = {
  id: 'generic',
  label: 'Generic (Basic D&D)',
  description: 'Basic data structures for generic dungeon generation',
  dataTypes: {
    monsters: {
      name: 'Monsters',
      fileName: 'generic-monsters-template.csv',
      description: 'Basic monster definitions with name and optional attributes',
      fields: [
        { name: 'name', type: 'string', required: true, description: 'Monster name' },
        { name: 'sm', type: 'number', required: false, description: 'Size modifier (-5 to +5)' },
        { name: 'cls', type: 'string', required: false, description: 'Creature class' },
        { name: 'subclass', type: 'string', required: false, description: 'Creature subclass' },
        { name: 'notes', type: 'string', required: false, description: 'Additional notes' },
        { name: 'source', type: 'string', required: false, description: 'Source material' }
      ],
      examples: [
        ['Goblin', '-2', 'Humanoid', 'Goblinoid', 'Sneaky and aggressive', 'Generic Bestiary'],
        ['Skeleton', '0', 'Undead', 'Animated', 'Mindless undead warrior', 'Generic Bestiary'],
        ['Orc', '0', 'Humanoid', 'Orcish', 'Brutal and savage', 'Generic Bestiary']
      ]
    },
    traps: {
      name: 'Traps',
      fileName: 'generic-traps-template.csv',
      description: 'Trap definitions with difficulty levels',
      fields: [
        { name: 'name', type: 'string', required: true, description: 'Trap name' },
        { name: 'level', type: 'number', required: false, description: 'Difficulty level (1-10)' },
        { name: 'notes', type: 'string', required: false, description: 'Trap description and effects' }
      ],
      examples: [
        ['Pit Trap', '1', 'A concealed pit with spikes at the bottom'],
        ['Arrow Trap', '2', 'Pressure plate triggers wall-mounted crossbow'],
        ['Poison Gas', '3', 'Hidden nozzles release toxic vapors']
      ]
    },
    doors: {
      name: 'Doors',
      fileName: 'generic-doors-template.csv',
      description: 'Door types and conditions',
      fields: [
        { name: 'type', type: 'enum', required: true, description: 'Door type', enumValues: ['normal', 'arch', 'portcullis', 'hole'] },
        { name: 'status', type: 'enum', required: true, description: 'Door condition', enumValues: ['locked', 'trapped', 'barred', 'jammed', 'warded', 'secret'] },
        { name: 'material', type: 'string', required: false, description: 'Door material' },
        { name: 'notes', type: 'string', required: false, description: 'Special properties' }
      ],
      examples: [
        ['normal', 'locked', 'Oak wood', 'Iron lock, sturdy construction'],
        ['arch', 'warded', 'Stone', 'Magical protection runes'],
        ['portcullis', 'barred', 'Iron', 'Heavy metal grating']
      ]
    },
    decorations: {
      name: 'Room Features',
      fileName: 'generic-decorations-template.csv',
      description: 'Room decorations and features',
      fields: [
        { name: 'name', type: 'string', required: true, description: 'Feature name' },
        { name: 'type', type: 'enum', required: false, description: 'Feature category', enumValues: ['furniture', 'decoration', 'structure', 'treasure', 'hazard'] },
        { name: 'weight', type: 'number', required: false, description: 'Random selection weight (1-10)', defaultValue: 1 },
        { name: 'description', type: 'string', required: false, description: 'Detailed description' }
      ],
      examples: [
        ['Crumbling Statue', 'decoration', '2', 'An ancient stone statue, weathered by time'],
        ['Moldy Furniture', 'furniture', '3', 'Old wooden chairs and tables, covered in mold'],
        ['Ominous Altar', 'structure', '1', 'A dark stone altar with mysterious symbols']
      ]
    }
  }
};