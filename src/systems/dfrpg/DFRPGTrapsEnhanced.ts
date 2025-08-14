interface TriggerCondition {
  type: 'pressure' | 'tripwire' | 'proximity' | 'touch' | 'magical' | 'sound' | 'movement';
  details: string;
  weight?: number; // For pressure plates
  range?: number; // For proximity/magical
}

interface DetectionMechanic {
  primary: string; // Main detection method
  alternatives?: string[]; // Alternative detection methods
  automatic?: string; // Conditions for automatic detection
  modifiers: string; // All applicable modifiers
}

interface DisarmMechanic {
  primary: string; // Main disarm method
  alternatives?: string[]; // Alternative methods
  timeRequired?: string; // Time to disarm
  consequences?: string; // What happens if failed
  modifiers: string;
}

interface TrapEffect {
  damage?: string; // GURPS damage notation
  affliction?: string; // Status effects with resistance
  special?: string; // Unique effects
  area?: string; // Area of effect
  duration?: string; // How long effects last
  save?: string; // Saving throw details
}

interface EnhancedTrap {
  name: string;
  level: number; // 1-10 complexity
  category: 'mechanical' | 'magical' | 'alchemical' | 'divine' | 'hybrid';
  trigger: TriggerCondition;
  detection: DetectionMechanic;
  disarm: DisarmMechanic;
  effect: TrapEffect;
  description: string;
  variants?: string[]; // Different versions or upgrades
  resetable?: boolean;
  notes?: string;
}

// Comprehensive trap database organized by level and type
const ENHANCED_TRAP_DATA: Record<number, EnhancedTrap[]> = {
  1: [
    {
      name: 'Simple Pit Trap',
      level: 1,
      category: 'mechanical',
      trigger: { type: 'pressure', details: 'Pressure plate (50+ lbs)', weight: 50 },
      detection: {
        primary: 'Per-2',
        alternatives: ['Traps+0'],
        automatic: 'Using 10-foot pole or careful probing',
        modifiers: 'Per-2 to notice; +4 if searching carefully'
      },
      disarm: {
        primary: 'Traps-1',
        alternatives: ['DX-3 to carefully avoid'],
        timeRequired: '30 seconds',
        modifiers: 'Traps-1 or DX-3'
      },
      effect: {
        damage: '1d-1 cr',
        special: 'Fall 5 feet into pit',
        duration: 'Until climbed out (Climbing-2 or DX-2)'
      },
      description: 'A camouflaged pit covered with thin wood and debris',
      resetable: true
    },
    {
      name: 'Poisoned Needle Lock',
      level: 1,
      category: 'mechanical',
      trigger: { type: 'touch', details: 'Attempting to pick lock without proper technique' },
      detection: {
        primary: 'Per-3',
        alternatives: ['Traps+1', 'Lockpicking+2'],
        modifiers: 'Per-3 to notice; Traps+1 or Lockpicking+2 if examining lock'
      },
      disarm: {
        primary: 'Traps+0',
        alternatives: ['Lockpicking+3 (careful technique)'],
        timeRequired: '1 minute',
        consequences: 'Triggers if failed by 3+',
        modifiers: 'Traps+0 or Lockpicking+3'
      },
      effect: {
        damage: '1d-3 imp',
        affliction: 'HT-1 vs mild poison (1 HP damage)',
        duration: 'Immediate'
      },
      description: 'A needle coated with weak poison hidden in the lock mechanism',
      resetable: true
    }
  ],
  2: [
    {
      name: 'Crossbow Bolt Trap',
      level: 2,
      category: 'mechanical',
      trigger: { type: 'tripwire', details: 'Thin wire across doorway or corridor' },
      detection: {
        primary: 'Per-3',
        alternatives: ['Traps+0'],
        automatic: 'Light source reveals wire glinting',
        modifiers: 'Per-3 to spot wire; automatic with good lighting'
      },
      disarm: {
        primary: 'Traps-1',
        alternatives: ['DX-2 to step over carefully'],
        timeRequired: '1 minute',
        modifiers: 'Traps-1 to disarm mechanism'
      },
      effect: {
        damage: '1d+2 imp',
        special: 'Targets random character in front rank',
        area: 'Single target'
      },
      description: 'Crossbow mechanism fires when tripwire is disturbed',
      variants: ['Poisoned bolt (+HT-2 vs 1d toxic)', 'Multiple bolts (3 attacks)'],
      resetable: true
    },
    {
      name: 'Alarm Glyph',
      level: 2,
      category: 'magical',
      trigger: { type: 'proximity', details: 'Any creature within 2 yards', range: 2 },
      detection: {
        primary: 'Detect Magic-1',
        alternatives: ['Traps-2', 'Thaumatology+0'],
        modifiers: 'Detect Magic-1 or Thaumatology+0 to sense magic'
      },
      disarm: {
        primary: 'Thaumatology-2',
        alternatives: ['Dispel Magic spell', 'Traps-4'],
        timeRequired: '2 minutes',
        modifiers: 'Thaumatology-2 or Dispel Magic'
      },
      effect: {
        special: 'Loud alarm (audible 100 yards), alerts nearby enemies',
        duration: '10 seconds of noise'
      },
      description: 'Magical glyph that sounds an alarm when triggered',
      resetable: false
    }
  ],
  3: [
    {
      name: 'Spiked Pit Trap',
      level: 3,
      category: 'mechanical',
      trigger: { type: 'pressure', details: 'Pressure plate (75+ lbs)', weight: 75 },
      detection: {
        primary: 'Per-3',
        alternatives: ['Traps+0'],
        automatic: 'Using 10-foot pole reveals false floor',
        modifiers: 'Per-3 to notice; Traps+0 if searching'
      },
      disarm: {
        primary: 'Traps-2',
        alternatives: ['DX-4 to leap across', 'Engineering to build bridge'],
        timeRequired: '2 minutes',
        modifiers: 'Traps-2 to jam mechanism'
      },
      effect: {
        damage: '2d-1 cr (fall) + 1d+1 imp (spikes)',
        special: 'Fall 10 feet onto iron spikes',
        duration: 'Until climbed out (Climbing-3 or DX-3)'
      },
      description: 'Deep pit with sharpened iron spikes at the bottom',
      variants: ['Poisoned spikes (+HT-2 vs 2d toxic)', 'Collapsing sides (Escape-4)'],
      resetable: true
    },
    {
      name: 'Scything Blade',
      level: 3,
      category: 'mechanical',
      trigger: { type: 'pressure', details: 'Floor tile depression (25+ lbs)', weight: 25 },
      detection: {
        primary: 'Per-4',
        alternatives: ['Traps-1'],
        modifiers: 'Per-4 to notice slight depression; Traps-1 to spot mechanism'
      },
      disarm: {
        primary: 'Traps-3',
        alternatives: ['Block with shield (Block+2)', 'Dodge (Dodge+0)'],
        timeRequired: '3 minutes to disarm',
        consequences: 'Immediate attack if disarm fails',
        modifiers: 'Traps-3 to disable safely'
      },
      effect: {
        damage: '2d+1 cut',
        special: 'Swings across corridor at waist height',
        area: 'All characters in corridor',
        save: 'Dodge+0 or Block+2 to avoid'
      },
      description: 'Heavy blade swings across the corridor when triggered',
      resetable: true
    }
  ],
  4: [
    {
      name: 'Fireball Glyph',
      level: 4,
      category: 'magical',
      trigger: { type: 'touch', details: 'Touching inscribed surface or object' },
      detection: {
        primary: 'Detect Magic-2',
        alternatives: ['Thaumatology-1', 'Traps-3'],
        modifiers: 'Detect Magic-2 or Thaumatology-1 to sense; Traps-3 to recognize'
      },
      disarm: {
        primary: 'Thaumatology-3',
        alternatives: ['Dispel Magic at -2', 'Traps-5'],
        timeRequired: '5 minutes',
        consequences: 'Triggers if magical disarm fails by 3+',
        modifiers: 'Thaumatology-3 or Dispel Magic-2'
      },
      effect: {
        damage: '3d burn',
        area: '2-yard radius',
        save: 'Dodge-2 to avoid, Block-4 with shield',
        special: 'Sets flammable items on fire'
      },
      description: 'Magical glyph that explodes in flames when touched',
      variants: ['Lightning (3d burn, sur)', 'Ice (2d+2 cr + slippery floor)'],
      resetable: false
    },
    {
      name: 'Crushing Walls',
      level: 4,
      category: 'mechanical',
      trigger: { type: 'pressure', details: 'Multiple pressure plates (100+ lbs total)', weight: 100 },
      detection: {
        primary: 'Per-2',
        alternatives: ['Traps-1', 'Architecture+0'],
        modifiers: 'Per-2 to notice; Architecture+0 to spot mechanism'
      },
      disarm: {
        primary: 'Traps-4',
        alternatives: ['ST-5 to jam mechanism', 'Hold walls apart with ST 20+'],
        timeRequired: '10 minutes to properly disarm',
        consequences: 'Walls start closing immediately if failed',
        modifiers: 'Traps-4 to disable; emergency options available'
      },
      effect: {
        damage: '3d cr per second for 3 seconds',
        special: 'Walls close over 3 seconds, escape possible until turn 2',
        area: 'Entire 10x10 room',
        save: 'DX+3 to escape before walls meet (only turn 1-2)'
      },
      description: 'Walls slowly close together, crushing anything inside',
      resetable: false,
      notes: 'Takes 3 seconds to fully close; escape possible in first 2 seconds'
    }
  ],
  5: [
    {
      name: 'Paralysis Gas Vent',
      level: 5,
      category: 'alchemical',
      trigger: { type: 'proximity', details: 'Breaking invisible beam across doorway', range: 1 },
      detection: {
        primary: 'Per-4',
        alternatives: ['Traps-2', 'Alchemy+0'],
        automatic: 'Dust or smoke reveals beam',
        modifiers: 'Per-4 to spot; automatic with particulates in air'
      },
      disarm: {
        primary: 'Traps-3',
        alternatives: ['Alchemy-2 to neutralize gas', 'Block vents with Engineering-2'],
        timeRequired: '5 minutes',
        modifiers: 'Traps-3 or Alchemy-2'
      },
      effect: {
        affliction: 'HT-3 vs Paralysis (1 minute)',
        area: '3-yard radius from vents',
        duration: 'Gas dissipates after 30 seconds',
        save: 'HT-3 each second in gas; failure = paralyzed 1 minute'
      },
      description: 'Hidden vents release paralyzing gas when beam is broken',
      variants: ['Sleep gas (HT-2 vs unconsciousness)', 'Poison gas (HT-4 vs 2d toxic)'],
      resetable: true,
      notes: 'Gas affects all in area; holding breath gives +3 to HT'
    },
    {
      name: 'Teleportation Circle',
      level: 5,
      category: 'magical',
      trigger: { type: 'proximity', details: 'Standing on circle for 3 seconds', range: 1 },
      detection: {
        primary: 'Detect Magic+0',
        alternatives: ['Thaumatology+1', 'Traps-4'],
        automatic: 'Circle is visible if looking for it',
        modifiers: 'Detect Magic+0 to sense; visible circle with Per+2'
      },
      disarm: {
        primary: 'Thaumatology-2',
        alternatives: ['Dispel Magic+0', 'Destroy circle (20 HP, DR 5)'],
        timeRequired: '10 minutes',
        modifiers: 'Thaumatology-2 to redirect; Dispel Magic+0 to disable'
      },
      effect: {
        special: 'Teleports to random dangerous location in dungeon',
        duration: 'Permanent until dispelled',
        save: 'Will-3 to resist if unwilling'
      },
      description: 'Magical circle that teleports those who stand on it',
      variants: ['Specific destination', 'Plane shift', 'Temporal displacement'],
      resetable: true
    }
  ],
  6: [
    {
      name: 'Chain Lightning Trap',
      level: 6,
      category: 'magical',
      trigger: { type: 'touch', details: 'Touching metal object or conducting surface' },
      detection: {
        primary: 'Detect Magic-3',
        alternatives: ['Thaumatology-2', 'Traps-4'],
        modifiers: 'Detect Magic-3 or Thaumatology-2 to sense charge'
      },
      disarm: {
        primary: 'Thaumatology-4',
        alternatives: ['Ground with metal rod (Traps-2)', 'Dispel Magic-3'],
        timeRequired: '10 minutes',
        consequences: 'Triggers if failed by 2+',
        modifiers: 'Thaumatology-4 or grounding techniques'
      },
      effect: {
        damage: '4d burn (sur)',
        special: 'Chains to all metal-wearing targets within 3 yards',
        area: 'Primary target + chain to others',
        save: 'No save for primary; others get Dodge-3'
      },
      description: 'Electrical trap that chains between metal-wearing targets',
      resetable: false
    }
  ],
  7: [
    {
      name: 'Disintegration Beam',
      level: 7,
      category: 'magical',
      trigger: { type: 'movement', details: 'First person to cross threshold' },
      detection: {
        primary: 'Detect Magic-4',
        alternatives: ['Thaumatology-3', 'Traps-5'],
        modifiers: 'Very difficult to detect; -4 to all attempts'
      },
      disarm: {
        primary: 'Thaumatology-5',
        alternatives: ['Reflect with mirror (Traps-3)', 'Dispel Magic-4'],
        timeRequired: '15 minutes',
        consequences: 'Triggers if failed by 1+',
        modifiers: 'Thaumatology-5 or clever techniques'
      },
      effect: {
        damage: '6d(10) dis',
        special: 'Disintegrates 1d yard diameter hole through target',
        area: 'Narrow beam, single target',
        save: 'Dodge-4 if aware; no save if surprised'
      },
      description: 'Invisible beam that disintegrates matter it touches',
      resetable: false,
      notes: 'Extremely dangerous; save-or-die effect'
    }
  ],
  8: [
    {
      name: 'Soul Drain Altar',
      level: 8,
      category: 'divine',
      trigger: { type: 'touch', details: 'Placing hands on altar or offering sacrifice' },
      detection: {
        primary: 'Detect Magic-2',
        alternatives: ['Theology-1', 'Occultism-2'],
        automatic: 'Dried blood and bone fragments visible around altar',
        modifiers: 'Detect Magic-2 or religious knowledge; obvious signs present'
      },
      disarm: {
        primary: 'Theology-4',
        alternatives: ['Exorcism ritual', 'Destroy altar (50 HP, DR 10)'],
        timeRequired: '1 hour',
        consequences: 'Triggers if interrupted',
        modifiers: 'Theology-4 or major religious magic'
      },
      effect: {
        affliction: 'Will-5 vs 1d FP drain per second (potentially fatal)',
        special: 'Drains life force until death or escape',
        duration: 'Until victim dies or breaks contact',
        save: 'Will-5 each second; death at FP 0'
      },
      description: 'Cursed altar that drains the life force of those who touch it',
      resetable: true,
      notes: 'Escape requires ST 15+ or successful Will+3 roll'
    }
  ],
  9: [
    {
      name: 'Maze of Mirrors',
      level: 9,
      category: 'magical',
      trigger: { type: 'proximity', details: 'Entering room', range: 0 },
      detection: {
        primary: 'Detect Magic-1',
        alternatives: ['Thaumatology+0', 'Illusion magic knowledge'],
        modifiers: 'Detect Magic-1 to sense; obvious once triggered'
      },
      disarm: {
        primary: 'Thaumatology-3',
        alternatives: ['Break all mirrors', 'Navigate maze (IQ-4 + 30 minutes)'],
        timeRequired: 'Variable',
        modifiers: 'Thaumatology-3 to dispel; IQ-4 to solve'
      },
      effect: {
        special: 'Traps party in illusory mirror maze',
        duration: 'Until dispelled or solved',
        affliction: 'Mental stress: 1 FP per 10 minutes trapped',
        save: 'IQ-4 roll every 10 minutes to find exit'
      },
      description: 'Room transforms into confusing maze of mirrors and illusions',
      resetable: true,
      notes: 'Party separated; must solve individually or cooperate'
    }
  ],
  10: [
    {
      name: 'Temporal Stasis Field',
      level: 10,
      category: 'magical',
      trigger: { type: 'magical', details: 'Detecting hostile intent within 5 yards', range: 5 },
      detection: {
        primary: 'Detect Magic-5',
        alternatives: ['Thaumatology-4', 'Chronolocation College'],
        modifiers: 'Nearly impossible to detect; -5 to all attempts'
      },
      disarm: {
        primary: 'Thaumatology-6',
        alternatives: ['Dispel Magic-5', 'Temporal anchor spell'],
        timeRequired: '1 hour',
        consequences: 'Triggers immediately if failed',
        modifiers: 'Requires master-level magic or time spells'
      },
      effect: {
        special: 'Freezes targets in time for 1d days',
        area: '5-yard radius',
        duration: '1d days (roll secretly)',
        save: 'Will-6; success reduces duration to 1d hours'
      },
      description: 'Ultimate trap that freezes intruders in temporal stasis',
      resetable: false,
      notes: 'Legendary trap; may require quest to break'
    }
  ]
};

// Weighted random selection for level-appropriate traps
const TRAP_LEVEL_WEIGHTS = {
  1: [1, 1, 1],     // Levels 1-3
  2: [2, 1, 1],
  3: [3, 2, 1],
  4: [2, 3, 2, 1],  // Levels 1-4
  5: [1, 2, 3, 2, 1],
  6: [0, 1, 2, 3, 2, 1],
  7: [0, 0, 1, 2, 3, 2, 1],
  8: [0, 0, 0, 1, 2, 3, 2, 1],
  9: [0, 0, 0, 0, 1, 2, 3, 2, 1],
  10: [0, 0, 0, 0, 0, 1, 2, 3, 2, 1]
};

export class DFRPGEnhancedTrapSystem {
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  generateTrap(dungeonLevel: number, complexity: 'simple' | 'standard' | 'complex' | 'deadly' = 'standard'): EnhancedTrap {
    const weights = TRAP_LEVEL_WEIGHTS[Math.min(dungeonLevel, 10)] || TRAP_LEVEL_WEIGHTS[10];
    const complexityModifier = this.getComplexityModifier(complexity);
    
    // Select trap level based on weights and complexity
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = this.rng() * totalWeight;
    let selectedLevel = 1;
    
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedLevel = Math.min(i + 1 + complexityModifier, 10);
        break;
      }
    }
    
    // Select random trap of chosen level
    const availableTraps = ENHANCED_TRAP_DATA[selectedLevel] || ENHANCED_TRAP_DATA[1];
    const selectedTrap = availableTraps[Math.floor(this.rng() * availableTraps.length)];
    
    return { ...selectedTrap };
  }

  private getComplexityModifier(complexity: string): number {
    switch (complexity) {
      case 'simple': return -1;
      case 'standard': return 0;
      case 'complex': return 1;
      case 'deadly': return 2;
      default: return 0;
    }
  }

  formatTrapDescription(trap: EnhancedTrap): string {
    const parts: string[] = [];
    
    parts.push(`**${trap.name}** (Level ${trap.level} ${trap.category})`);
    parts.push(`Trigger: ${trap.trigger.details}`);
    parts.push(`Detection: ${trap.detection.modifiers}`);
    parts.push(`Disarm: ${trap.disarm.modifiers}`);
    
    if (trap.effect.damage) {
      parts.push(`Damage: ${trap.effect.damage}`);
    }
    if (trap.effect.affliction) {
      parts.push(`Effect: ${trap.effect.affliction}`);
    }
    if (trap.effect.special) {
      parts.push(`Special: ${trap.effect.special}`);
    }
    if (trap.effect.area && trap.effect.area !== 'Single target') {
      parts.push(`Area: ${trap.effect.area}`);
    }
    
    parts.push(`Description: ${trap.description}`);
    
    if (trap.notes) {
      parts.push(`Notes: ${trap.notes}`);
    }
    
    return parts.join('\n');
  }

  // Get all traps of a specific level for reference
  getTrapsOfLevel(level: number): EnhancedTrap[] {
    return ENHANCED_TRAP_DATA[level] || [];
  }

  // Get trap categories for filtering
  getTrapsByCategory(category: EnhancedTrap['category']): EnhancedTrap[] {
    const result: EnhancedTrap[] = [];
    Object.values(ENHANCED_TRAP_DATA).forEach(levelTraps => {
      result.push(...levelTraps.filter(trap => trap.category === category));
    });
    return result;
  }
}

export default DFRPGEnhancedTrapSystem;