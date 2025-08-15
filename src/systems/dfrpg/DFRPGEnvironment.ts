interface EnvironmentalModifier {
  tag: string;
  name: string;
  description: string;
  mechanics: string;
  weight: number;
  category: 'terrain' | 'visibility' | 'space' | 'atmospheric' | 'magical';
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  roomTypes?: ('chamber' | 'hall' | 'cavern' | 'lair' | 'special')[];
  stackable?: boolean; // Can combine with other modifiers
}

interface RoomEnvironment {
  modifiers: EnvironmentalModifier[];
  totalPenalty: number;
  description: string;
  tacticalNotes: string[];
}

const ENVIRONMENTAL_MODIFIERS: EnvironmentalModifier[] = [
  // Terrain Modifiers
  {
    tag: 'water_knee_deep',
    name: 'Knee-Deep Water',
    description: 'Standing water reaches mid-thigh, making movement difficult',
    mechanics: '-1 to Move, -1 to attacks, -2 to Dodge while moving',
    weight: 3,
    category: 'terrain',
    severity: 'moderate',
    roomTypes: ['cavern', 'chamber'],
    stackable: true
  },
  {
    tag: 'water_waist_deep',
    name: 'Waist-Deep Water',
    description: 'Deep water that significantly impedes movement and combat',
    mechanics: '-2 to Move, -2 to attacks, -3 to Dodge, Swimming rolls required if knocked down',
    weight: 2,
    category: 'terrain',
    severity: 'severe',
    roomTypes: ['cavern', 'chamber'],
    stackable: true
  },
  {
    tag: 'bad_footing_rubble',
    name: 'Rubble and Debris',
    description: 'Broken stone, collapsed masonry, and scattered debris cover the floor',
    mechanics: '-2 to defense, -1 to Move, DX-2 roll to avoid falling when running',
    weight: 4,
    category: 'terrain',
    severity: 'moderate',
    roomTypes: ['chamber', 'cavern', 'lair'],
    stackable: true
  },
  {
    tag: 'ice_slippery',
    name: 'Icy Floor',
    description: 'Frozen water or magical ice makes footing treacherous',
    mechanics: 'DX-2 roll to avoid falling when moving, -1 to all attacks, -2 to defense',
    weight: 2,
    category: 'terrain',
    severity: 'moderate',
    roomTypes: ['chamber', 'cavern', 'hall'],
    stackable: true
  },
  {
    tag: 'grease_slick',
    name: 'Grease or Oil',
    description: 'Slippery substances coat the floor from spilled oil or magical effects',
    mechanics: 'DX-3 roll to avoid falling, -2 to attacks, -3 to defense while moving',
    weight: 1,
    category: 'terrain',
    severity: 'severe',
    roomTypes: ['chamber', 'lair'],
    stackable: true
  },
  {
    tag: 'stairs_advantage',
    name: 'Stairs or Slope',
    description: 'Stepped or sloped terrain provides tactical advantages',
    mechanics: '+1 to attacks from higher ground, -1 to attacks from lower ground',
    weight: 2,
    category: 'terrain',
    severity: 'minor',
    roomTypes: ['chamber', 'hall'],
    stackable: true
  },
  {
    tag: 'unstable_floor',
    name: 'Unstable Flooring',
    description: 'Rotted wood, loose stones, or weakened floor threatens to collapse',
    mechanics: 'Per-2 to notice weak spots, DX-3 to avoid falling through (1d cr damage)',
    weight: 1,
    category: 'terrain',
    severity: 'severe',
    roomTypes: ['chamber', 'lair'],
    stackable: false
  },

  // Visibility Conditions - GURPS Official Lighting Scale
  {
    tag: 'daylight',
    name: 'Daylight',
    description: 'Bright natural daylight or magical equivalent',
    mechanics: 'No vision penalties, optimal lighting conditions',
    weight: 1,
    category: 'visibility',
    severity: 'minor',
    stackable: false
  },
  {
    tag: 'bright_artificial',
    name: 'Bright Artificial Light',
    description: 'Well-lit area with multiple torches, lanterns, or Continual Light spells',
    mechanics: '-1 to vision rolls (GURPS lighting scale)',
    weight: 2,
    category: 'visibility',
    severity: 'minor',
    stackable: false
  },
  {
    tag: 'good_lighting',
    name: 'Good Lighting',
    description: 'Adequate torch or lantern light for most activities',
    mechanics: '-2 to vision rolls (GURPS lighting scale)',
    weight: 3,
    category: 'visibility',
    severity: 'minor',
    stackable: false
  },
  {
    tag: 'poor_lighting',
    name: 'Poor Lighting',
    description: 'Guttering torch, dying fire, or distant light source',
    mechanics: '-3 to vision rolls (GURPS lighting scale)',
    weight: 4,
    category: 'visibility',
    severity: 'moderate',
    stackable: false
  },
  {
    tag: 'bad_lighting',
    name: 'Bad Lighting',
    description: 'Failing candle, ember glow, or filtered moonlight',
    mechanics: '-4 to vision rolls (GURPS lighting scale)',
    weight: 3,
    category: 'visibility',
    severity: 'moderate',
    stackable: false
  },
  {
    tag: 'twilight_lighting',
    name: 'Twilight',
    description: 'Dawn, dusk, or very dim ambient light',
    mechanics: '-5 to vision rolls (GURPS lighting scale)',
    weight: 3,
    category: 'visibility',
    severity: 'moderate',
    stackable: false
  },
  {
    tag: 'moonlight',
    name: 'Moonlight',
    description: 'Clear night with full moon or starlight',
    mechanics: '-6 to vision rolls (GURPS lighting scale)',
    weight: 2,
    category: 'visibility',
    severity: 'severe',
    stackable: false
  },
  {
    tag: 'darkness_spell',
    name: 'Darkness Spell',
    description: 'Magical darkness created by the Darkness spell',
    mechanics: '-9 to vision rolls, normal light sources provide -6 instead (Spells p.XX)',
    weight: 1,
    category: 'visibility',
    severity: 'severe',
    roomTypes: ['lair', 'special'],
    stackable: false
  },
  {
    tag: 'total_darkness',
    name: 'Total Darkness',
    description: 'Complete absence of light',
    mechanics: '-10 to vision rolls (Basic Set p.B358)',
    weight: 2,
    category: 'visibility',
    severity: 'extreme',
    stackable: false
  },
  {
    tag: 'blackout_spell',
    name: 'Blackout Spell',
    description: 'Magical total darkness that negates all light sources',
    mechanics: '-10 to vision rolls, light sources negated (Spells p.XX)',
    weight: 1,
    category: 'visibility',
    severity: 'extreme',
    roomTypes: ['lair', 'special'],
    stackable: false
  },
  {
    tag: 'fog_spell',
    name: 'Fog Spell',
    description: 'Magical fog that blocks vision and movement',
    mechanics: '-1 to vision per yard distance, -2 to Move, blocks line of sight (Spells p.XX)',
    weight: 2,
    category: 'visibility',
    severity: 'severe',
    roomTypes: ['cavern', 'chamber'],
    stackable: true
  },
  {
    tag: 'thick_fog_natural',
    name: 'Natural Thick Fog',
    description: 'Dense natural mist or fog',
    mechanics: '-1 to vision per yard distance, -1 to Move, limits ranged attacks',
    weight: 2,
    category: 'visibility',
    severity: 'severe',
    roomTypes: ['cavern', 'chamber'],
    stackable: true
  },
  {
    tag: 'smoke_spell',
    name: 'Smoke Spell',
    description: 'Magical smoke that chokes and blinds',
    mechanics: '-2 to vision per yard, HT-2 vs choking every 10 seconds, -2 to attacks (Spells p.XX)',
    weight: 1,
    category: 'visibility',
    severity: 'severe',
    roomTypes: ['chamber', 'lair'],
    stackable: true
  },
  {
    tag: 'smoke_natural',
    name: 'Natural Smoke',
    description: 'Smoke from fires, burning oil, or torches',
    mechanics: '-2 to vision per yard, HT-2 vs coughing every minute, -1 to attacks',
    weight: 2,
    category: 'visibility',
    severity: 'severe',
    roomTypes: ['chamber', 'lair'],
    stackable: true
  },

  // Space Constraints
  {
    tag: 'low_ceiling',
    name: 'Low Ceiling',
    description: 'Ceiling height forces most characters to stoop or crouch',
    mechanics: '-2 to swinging attacks, no jumping maneuvers, -1 to Move if over 6 feet tall',
    weight: 3,
    category: 'space',
    severity: 'moderate',
    roomTypes: ['hall', 'chamber'],
    stackable: true
  },
  {
    tag: 'narrow_corridor',
    name: 'Narrow Space',
    description: 'Space only allows single-file movement for human-sized characters',
    mechanics: 'Single file only, -2 to Dodge, flanking impossible, reach weapons at -2',
    weight: 2,
    category: 'space',
    severity: 'moderate',
    roomTypes: ['hall'],
    stackable: true
  },
  {
    tag: 'cramped_quarters',
    name: 'Cramped Quarters',
    description: 'Very tight spaces with multiple obstacles limiting movement',
    mechanics: 'No Retreat defense option, -2 to swinging weapons, -1 to Move',
    weight: 2,
    category: 'space',
    severity: 'severe',
    roomTypes: ['chamber', 'lair'],
    stackable: true
  },
  {
    tag: 'high_ceiling',
    name: 'Soaring Ceiling',
    description: 'Extremely high ceiling creates acoustic and psychological effects',
    mechanics: '+2 to Hearing rolls, -1 to Intimidation (voices seem small), flying enemies gain advantage',
    weight: 1,
    category: 'space',
    severity: 'minor',
    roomTypes: ['chamber', 'special'],
    stackable: true
  },
  {
    tag: 'pillars_cover',
    name: 'Pillar Forest',
    description: 'Multiple structural pillars provide cover but limit movement',
    mechanics: '+2 to +4 defense when using cover, -1 to Move, charge attacks difficult',
    weight: 2,
    category: 'space',
    severity: 'minor',
    roomTypes: ['chamber', 'special'],
    stackable: true
  },

  // Atmospheric Conditions
  {
    tag: 'cold_freezing',
    name: 'Freezing Cold',
    description: 'Supernatural or natural cold that affects performance',
    mechanics: 'HT-2 rolls every 10 minutes, failure = 1 FP loss, -1 to DX after 1 FP lost',
    weight: 2,
    category: 'atmospheric',
    severity: 'moderate',
    roomTypes: ['cavern', 'chamber'],
    stackable: true
  },
  {
    tag: 'heat_sweltering',
    name: 'Sweltering Heat',
    description: 'Oppressive heat from forges, lava, or magical sources',
    mechanics: 'HT-1 rolls every 10 minutes, failure = 1 FP loss, -1 to IQ after 2 FP lost',
    weight: 2,
    category: 'atmospheric',
    severity: 'moderate',
    roomTypes: ['lair', 'chamber'],
    stackable: true
  },
  {
    tag: 'toxic_air',
    name: 'Toxic Atmosphere',
    description: 'Poisonous gases, spores, or magical miasma fill the air',
    mechanics: 'HT-3 rolls every minute, failure = 1 HP toxic damage, holding breath gives +3',
    weight: 1,
    category: 'atmospheric',
    severity: 'severe',
    roomTypes: ['lair', 'cavern'],
    stackable: false
  },
  {
    tag: 'echo_chamber',
    name: 'Echo Chamber',
    description: 'Acoustic properties amplify sounds dramatically',
    mechanics: '+3 to Hearing rolls, -2 to Stealth, loud sounds may alert distant enemies',
    weight: 2,
    category: 'atmospheric',
    severity: 'minor',
    roomTypes: ['chamber', 'cavern'],
    stackable: true
  },
  {
    tag: 'silence_zone',
    name: 'Zone of Silence',
    description: 'Magical or natural dampening of all sound',
    mechanics: 'No sound-based communication, -4 to Hearing, Stealth bonuses negated',
    weight: 1,
    category: 'atmospheric',
    severity: 'moderate',
    roomTypes: ['special', 'chamber'],
    stackable: false
  },

  // Magical Effects - GURPS Mana Levels
  {
    tag: 'no_mana',
    name: 'No Mana Zone',
    description: 'Area completely devoid of magical energy',
    mechanics: 'No spells possible, magic items don\'t function, no mana recovery (DFRPG Spells p.7)',
    weight: 1,
    category: 'magical',
    severity: 'extreme',
    roomTypes: ['special', 'chamber'],
    stackable: false
  },
  {
    tag: 'low_mana',
    name: 'Low Mana Zone',
    description: 'Magical energy is sparse and difficult to access',
    mechanics: 'All spells at -5, FP costs doubled, mana recovery halved (DFRPG Spells p.7)',
    weight: 1,
    category: 'magical',
    severity: 'severe',
    roomTypes: ['special', 'chamber'],
    stackable: false
  },
  {
    tag: 'high_mana',
    name: 'High Mana Zone',
    description: 'Magical energy flows freely and abundantly',
    mechanics: 'All spells at +3, FP costs halved, double mana recovery (DFRPG Spells p.7)',
    weight: 1,
    category: 'magical',
    severity: 'minor',
    roomTypes: ['special', 'lair'],
    stackable: false
  },
  {
    tag: 'very_high_mana',
    name: 'Very High Mana Zone',
    description: 'Extremely potent magical energies saturate the area',
    mechanics: 'All spells at +5, FP costs quartered, triple mana recovery, critical spell failure risk (DFRPG Spells p.7)',
    weight: 1,
    category: 'magical',
    severity: 'moderate',
    roomTypes: ['special', 'lair'],
    stackable: false
  },

  // Sanctity Levels
  {
    tag: 'no_sanctity',
    name: 'Desecrated Ground',
    description: 'Area completely devoid of divine influence',
    mechanics: 'No clerical spells, holy symbols don\'t function, Turn Undead impossible (DFRPG Spells p.5)',
    weight: 1,
    category: 'magical',
    severity: 'severe',
    roomTypes: ['lair', 'special'],
    stackable: false
  },
  {
    tag: 'low_sanctity',
    name: 'Unholy Ground',
    description: 'Divine power is weakened by evil influences',
    mechanics: 'Clerical spells at -3, Turn Undead at -5, evil creatures get +1 (DFRPG Spells p.5)',
    weight: 1,
    category: 'magical',
    severity: 'moderate',
    roomTypes: ['lair', 'chamber'],
    stackable: false
  },
  {
    tag: 'high_sanctity',
    name: 'Blessed Ground',
    description: 'Area suffused with divine power and protection',
    mechanics: 'Clerical spells at +3, Turn Undead at +5, evil creatures at -2 (DFRPG Spells p.5)',
    weight: 1,
    category: 'magical',
    severity: 'minor',
    roomTypes: ['special', 'chamber'],
    stackable: false
  },
  {
    tag: 'very_high_sanctity',
    name: 'Sacred Shrine',
    description: 'Extremely holy ground with powerful divine presence',
    mechanics: 'Clerical spells at +5, Turn Undead at +8, evil creatures flee or take damage (DFRPG Spells p.5)',
    weight: 1,
    category: 'magical',
    severity: 'minor',
    roomTypes: ['special'],
    stackable: false
  },

  // Nature's Strength Levels
  {
    tag: 'no_nature',
    name: 'Blighted Land',
    description: 'Natural forces are completely absent or corrupted',
    mechanics: 'No druidic spells, Plant/Animal spells impossible, nature spirits hostile (DFRPG Spells p.6)',
    weight: 1,
    category: 'magical',
    severity: 'severe',
    roomTypes: ['lair', 'special'],
    stackable: false
  },
  {
    tag: 'low_nature',
    name: 'Tainted Nature',
    description: 'Natural energies are weakened or corrupted',
    mechanics: 'Plant/Animal spells at -3, druidic magic at -2, nature spirits avoid area (DFRPG Spells p.6)',
    weight: 1,
    category: 'magical',
    severity: 'moderate',
    roomTypes: ['chamber', 'lair'],
    stackable: false
  },
  {
    tag: 'high_nature',
    name: 'Wild Grove',
    description: 'Natural forces are strong and vibrant',
    mechanics: 'Plant/Animal spells at +3, druidic magic at +2, nature spirits friendly (DFRPG Spells p.6)',
    weight: 1,
    category: 'magical',
    severity: 'minor',
    roomTypes: ['cavern', 'special'],
    stackable: false
  },
  {
    tag: 'very_high_nature',
    name: 'Primal Sanctuary',
    description: 'Extremely potent natural energies flow through this place',
    mechanics: 'Plant/Animal spells at +5, druidic magic at +4, spontaneous plant growth (DFRPG Spells p.6)',
    weight: 1,
    category: 'magical',
    severity: 'minor',
    roomTypes: ['cavern', 'special'],
    stackable: false
  }
];

export class DFRPGEnvironmentalSystem {
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  generateRoomEnvironment(
    roomType: 'chamber' | 'hall' | 'cavern' | 'lair' | 'special',
    dungeonLevel: number,
    complexity: 'minimal' | 'moderate' | 'challenging' | 'extreme' = 'moderate'
  ): RoomEnvironment {
    const applicableModifiers = ENVIRONMENTAL_MODIFIERS.filter(mod => 
      !mod.roomTypes || mod.roomTypes.includes(roomType)
    );

    const selectedModifiers: EnvironmentalModifier[] = [];
    const maxModifiers = this.getMaxModifiers(complexity);

    // Always try for at least one modifier in challenging+ environments
    const guaranteedModifier = complexity === 'challenging' || complexity === 'extreme';

    // Select modifiers based on category weights and compatibility
    const categories: (EnvironmentalModifier['category'])[] = ['terrain', 'visibility', 'space', 'atmospheric', 'magical'];
    
    for (const category of categories) {
      if (selectedModifiers.length >= maxModifiers) break;

      const categoryModifiers = applicableModifiers.filter(mod => 
        mod.category === category && 
        this.isCompatibleWithSelected(mod, selectedModifiers)
      );

      if (categoryModifiers.length === 0) continue;

      const categoryChance = this.getCategoryChance(category, dungeonLevel, complexity);
      if (this.rng() < categoryChance || (guaranteedModifier && selectedModifiers.length === 0)) {
        const totalWeight = categoryModifiers.reduce((sum, mod) => sum + mod.weight, 0);
        let random = this.rng() * totalWeight;

        for (const modifier of categoryModifiers) {
          random -= modifier.weight;
          if (random <= 0) {
            selectedModifiers.push(modifier);
            break;
          }
        }
      }
    }

    return this.buildEnvironmentDescription(selectedModifiers);
  }

  private getMaxModifiers(complexity: string): number {
    switch (complexity) {
      case 'minimal': return 1;
      case 'moderate': return 2;
      case 'challenging': return 3;
      case 'extreme': return 4;
      default: return 2;
    }
  }

  private getBaseChance(complexity: string, dungeonLevel: number): number {
    const baseChances: Record<string, number> = { minimal: 0.3, moderate: 0.5, challenging: 0.7, extreme: 0.9 };
    const levelBonus = Math.min(dungeonLevel * 0.05, 0.3);
    return Math.min((baseChances[complexity] || 0.5) + levelBonus, 0.95);
  }

  private getCategoryChance(category: EnvironmentalModifier['category'], dungeonLevel: number, complexity: string): number {
    const baseChances: Record<string, number> = {
      terrain: 0.4,
      visibility: 0.35,
      space: 0.3,
      atmospheric: 0.25,
      magical: Math.min(0.1 + (dungeonLevel * 0.02), 0.4)
    };

    const complexityMultiplier: Record<string, number> = {
      minimal: 0.7,
      moderate: 1.0,
      challenging: 1.3,
      extreme: 1.6
    };

    return baseChances[category] * (complexityMultiplier[complexity] || 1.0);
  }

  private isCompatibleWithSelected(modifier: EnvironmentalModifier, selected: EnvironmentalModifier[]): boolean {
    // Check if this modifier can stack with existing ones
    if (!modifier.stackable) {
      const hasConflict = selected.some(sel => 
        sel.category === modifier.category && !sel.stackable
      );
      if (hasConflict) return false;
    }

    // Specific incompatibilities
    const lightingLevels = [
      'daylight', 'bright_artificial', 'good_lighting', 'poor_lighting', 
      'bad_lighting', 'twilight_lighting', 'moonlight', 'darkness_spell', 
      'total_darkness', 'blackout_spell'
    ];
    
    const manaLevels = ['no_mana', 'low_mana', 'high_mana', 'very_high_mana'];
    const sanctityLevels = ['no_sanctity', 'low_sanctity', 'high_sanctity', 'very_high_sanctity'];
    const natureLevels = ['no_nature', 'low_nature', 'high_nature', 'very_high_nature'];
    
    const incompatibleTags: Record<string, string[]> = {
      // All lighting levels are mutually exclusive
      ...Object.fromEntries(lightingLevels.map(level => [
        level, lightingLevels.filter(other => other !== level)
      ])),
      
      // All mana levels are mutually exclusive
      ...Object.fromEntries(manaLevels.map(level => [
        level, manaLevels.filter(other => other !== level)
      ])),
      
      // All sanctity levels are mutually exclusive
      ...Object.fromEntries(sanctityLevels.map(level => [
        level, sanctityLevels.filter(other => other !== level)
      ])),
      
      // All nature strength levels are mutually exclusive
      ...Object.fromEntries(natureLevels.map(level => [
        level, natureLevels.filter(other => other !== level)
      ])),
      
      // Water and ice interactions
      'water_knee_deep': ['water_waist_deep', 'ice_slippery'],
      'water_waist_deep': ['water_knee_deep', 'ice_slippery', 'grease_slick'],
      'ice_slippery': ['water_knee_deep', 'water_waist_deep', 'grease_slick'],
      
      // Temperature conflicts
      'cold_freezing': ['heat_sweltering'],
      'heat_sweltering': ['cold_freezing']
    };

    const conflicts = incompatibleTags[modifier.tag] || [];
    return !selected.some(sel => conflicts.includes(sel.tag));
  }

  private buildEnvironmentDescription(modifiers: EnvironmentalModifier[]): RoomEnvironment {
    if (modifiers.length === 0) {
      return {
        modifiers: [],
        totalPenalty: 0,
        description: 'Normal room conditions',
        tacticalNotes: []
      };
    }

    const description = this.generateDescription(modifiers);
    const tacticalNotes = this.generateTacticalNotes(modifiers);
    const totalPenalty = this.calculateTotalPenalty(modifiers);

    return {
      modifiers,
      totalPenalty,
      description,
      tacticalNotes
    };
  }

  private generateDescription(modifiers: EnvironmentalModifier[]): string {
    const descriptions = modifiers.map(mod => mod.description);
    
    if (descriptions.length === 1) {
      return descriptions[0];
    } else if (descriptions.length === 2) {
      return `${descriptions[0]} Additionally, ${descriptions[1].toLowerCase()}`;
    } else {
      const last = descriptions.pop();
      return `${descriptions.join(', ')}, and ${last?.toLowerCase()}`;
    }
  }

  private generateTacticalNotes(modifiers: EnvironmentalModifier[]): string[] {
    const notes: string[] = [];
    
    modifiers.forEach(mod => {
      notes.push(`${mod.name}: ${mod.mechanics}`);
    });

    // Add combination effects
    if (modifiers.some(m => m.category === 'visibility') && modifiers.some(m => m.category === 'terrain')) {
      notes.push('Combined Effect: Poor visibility + difficult terrain increases fall risk');
    }

    if (modifiers.some(m => m.tag.includes('water')) && modifiers.some(m => m.category === 'atmospheric')) {
      notes.push('Combined Effect: Water may freeze in cold or boil in extreme heat');
    }

    return notes;
  }

  private calculateTotalPenalty(modifiers: EnvironmentalModifier[]): number {
    const severityValues = { minor: 1, moderate: 2, severe: 3, extreme: 4 };
    return modifiers.reduce((total, mod) => total + severityValues[mod.severity], 0);
  }

  // Utility methods for external use
  getModifiersByCategory(category: EnvironmentalModifier['category']): EnvironmentalModifier[] {
    return ENVIRONMENTAL_MODIFIERS.filter(mod => mod.category === category);
  }

  getModifiersBySeverity(severity: EnvironmentalModifier['severity']): EnvironmentalModifier[] {
    return ENVIRONMENTAL_MODIFIERS.filter(mod => mod.severity === severity);
  }

  formatEnvironmentForRoom(environment: RoomEnvironment): string {
    if (environment.modifiers.length === 0) {
      return 'Environment: Standard conditions';
    }

    const parts: string[] = [];
    parts.push(`Environment: ${environment.description}`);
    parts.push(`Tactical Effects:`);
    environment.tacticalNotes.forEach(note => {
      parts.push(`  - ${note}`);
    });
    parts.push(`Challenge Level: ${this.getPenaltyDescription(environment.totalPenalty)}`);

    return parts.join('\n');
  }

  private getPenaltyDescription(penalty: number): string {
    if (penalty <= 2) return 'Minor hindrance';
    if (penalty <= 4) return 'Moderate challenge';
    if (penalty <= 6) return 'Significant obstacle';
    return 'Extreme hazard';
  }
}

export default DFRPGEnvironmentalSystem;