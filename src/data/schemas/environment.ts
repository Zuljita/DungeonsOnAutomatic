import { ModuleSchema } from './types';

export const environmentSchema: ModuleSchema = {
  id: 'environment',
  label: 'Environment',
  description: 'Environmental details like lighting, ceilings, and DFRPG-specific conditions',
  dataTypes: {
    lighting: {
      name: 'Lighting',
      fileName: 'environment-lighting-template.csv',
      description: 'Lighting conditions with descriptions and weights',
      fields: [
        { name: 'name', type: 'string', required: true, description: 'Lighting condition' },
        { name: 'description', type: 'string', required: true, description: 'Details about the lighting' },
        { name: 'weight', type: 'number', required: true, description: 'Random selection weight (1+)' }
      ],
      examples: [
        ['Well-lit', 'The area is well-lit by an unknown, magical source.', '1'],
        ['Dimly lit', 'The area is dimly lit by glowing fungi.', '1'],
        ['Unlit', 'The area is unlit. Characters will require their own light sources or dark vision.', '1']
      ]
    },
    ceilings: {
      name: 'Ceilings',
      fileName: 'environment-ceilings-template.csv',
      description: 'Ceiling heights and descriptions',
      fields: [
        { name: 'name', type: 'string', required: true, description: 'Ceiling type' },
        { name: 'description', type: 'string', required: true, description: 'Ceiling description' },
        { name: 'weight', type: 'number', required: true, description: 'Random selection weight (1+)' }
      ],
      examples: [
        ['Standard Height', '10-foot high ceilings.', '1'],
        ['High Ceilings', '20-foot high ceilings.', '1'],
        ['Cavernous', 'Cavernous ceilings at least 60 feet high.', '1']
      ]
    },
    'dfrpg-mana-levels': {
      name: 'DFRPG Mana Levels',
      fileName: 'environment-dfrpg-mana-levels-template.csv',
      description: 'DFRPG mana level descriptions and weights',
      fields: [
        { name: 'name', type: 'string', required: true, description: 'Mana level' },
        { name: 'description', type: 'string', required: true, description: 'Mana effect description' },
        { name: 'weight', type: 'number', required: true, description: 'Random selection weight (1+)' }
      ],
      examples: [
        ['Very High Mana', 'Magic works at +5. All spells cost 1 less fatigue to cast (minimum 1).', '1'],
        ['High Mana', 'Magic works at +2.', '2'],
        ['Normal Mana', 'No modifier to magic.', '6']
      ]
    },
    'dfrpg-sanctity-levels': {
      name: 'DFRPG Sanctity Levels',
      fileName: 'environment-dfrpg-sanctity-levels-template.csv',
      description: 'DFRPG sanctity level descriptions and weights',
      fields: [
        { name: 'name', type: 'string', required: true, description: 'Sanctity level' },
        { name: 'description', type: 'string', required: true, description: 'Sanctity effect description' },
        { name: 'weight', type: 'number', required: true, description: 'Random selection weight (1+)' }
      ],
      examples: [
        ['Hallowed Ground', 'Clerics and holy warriors get +1 to all skill rolls. Unholy beings are at -1.', '1'],
        ['Neutral Ground', 'No modifier to sanctity.', '10'],
        ['Unholy Ground', 'Clerics and holy warriors are at -1 to all skill rolls. Unholy beings are at +1.', '1']
      ]
    },
    'dfrpg-natures-strength': {
      name: "DFRPG Nature's Strength",
      fileName: 'environment-dfrpg-natures-strength-template.csv',
      description: "DFRPG nature's strength descriptions and weights",
      fields: [
        { name: 'name', type: 'string', required: true, description: "Nature's strength" },
        { name: 'description', type: 'string', required: true, description: 'Effect description' },
        { name: 'weight', type: 'number', required: true, description: 'Random selection weight (1+)' }
      ],
      examples: [
        ['Pristine/Verdant', 'Druidic and elemental spells are at +2. Clerical turning of undead is at +2.', '1'],
        ['Neutral', "No modifier to nature's strength.", '10'],
        ['Barren/Eldritch', 'Druidic and elemental spells are at -2. Clerical turning of undead is at -2.', '1']
      ]
    }
  }
};
