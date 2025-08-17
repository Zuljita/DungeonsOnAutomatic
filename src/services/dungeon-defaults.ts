import type { DungeonDefaults, RNG } from '../core/types.js';

// GURPS DF naming components for generating dungeon names
const DUNGEON_PREFIXES = [
  'The Ancient', 'The Cursed', 'The Lost', 'The Forgotten', 'The Abandoned',
  'The Ruined', 'The Hidden', 'The Secret', 'The Forbidden', 'The Sacred',
  'The Unholy', 'The Blessed', 'The Dark', 'The Shadow', 'The Crystal',
  'The Iron', 'The Stone', 'The Golden', 'The Silver', 'The Blood',
  'The Frost', 'The Fire', 'The Storm', 'The Deep', 'The High'
];

const DUNGEON_TYPES = [
  'Catacombs', 'Labyrinth', 'Crypts', 'Sanctum', 'Temple', 'Monastery',
  'Citadel', 'Fortress', 'Keep', 'Tower', 'Spire', 'Depths', 'Caverns',
  'Mines', 'Tunnels', 'Chambers', 'Vaults', 'Prison', 'Dungeon', 'Ruins',
  'Halls', 'Palace', 'Tomb', 'Necropolis', 'Shrine', 'Observatory',
  'Library', 'Academy', 'Forge', 'Workshop'
];

const DUNGEON_SUFFIXES = [
  'of Eternal Darkness', 'of Lost Souls', 'of Ancient Power', 'of the Damned',
  'of the Fallen', 'of Whispers', 'of Shadows', 'of Light', 'of the Gods',
  'of the Dead', 'of Despair', 'of Hope', 'of Glory', 'of Doom', 'of Fate',
  'of the Moon', 'of the Sun', 'of Stars', 'of Time', 'of Memory',
  'of Dreams', 'of Nightmares', 'of Secrets', 'of Truth', 'of Lies',
  'of the Elements', 'of the Void', 'of Creation', 'of Destruction'
];

/**
 * Generates default dungeon settings including name, mana level, sanctity, and nature's strength
 */
export class DungeonDefaultsService {
  private rng: RNG;

  constructor(rng: RNG = Math.random) {
    this.rng = rng;
  }

  /**
   * Generate random dungeon defaults
   */
  generateDefaults(): DungeonDefaults {
    return {
      name: this.generateDungeonName(),
      manaLevel: this.generateManaLevel(),
      sanctity: this.generateSanctity(),
      nature: this.generateNatureStrength()
    };
  }

  /**
   * Generate a random dungeon name using GURPS DF style naming
   */
  private generateDungeonName(): string {
    const usePrefix = this.rng() < 0.8; // 80% chance of prefix
    const useSuffix = this.rng() < 0.6; // 60% chance of suffix
    
    let name = '';
    
    if (usePrefix) {
      const prefix = DUNGEON_PREFIXES[Math.floor(this.rng() * DUNGEON_PREFIXES.length)];
      name += prefix + ' ';
    }
    
    const type = DUNGEON_TYPES[Math.floor(this.rng() * DUNGEON_TYPES.length)];
    name += type;
    
    if (useSuffix) {
      const suffix = DUNGEON_SUFFIXES[Math.floor(this.rng() * DUNGEON_SUFFIXES.length)];
      name += ' ' + suffix;
    }
    
    return name;
  }

  /**
   * Generate random mana level with appropriate distribution
   */
  private generateManaLevel(): DungeonDefaults['manaLevel'] {
    const roll = this.rng();
    
    // Distribution based on GURPS DF recommendations
    if (roll < 0.05) return 'none';     // 5% - No mana zones are rare
    if (roll < 0.15) return 'low';      // 10% - Low mana for challenging areas
    if (roll < 0.70) return 'normal';   // 55% - Normal is most common
    if (roll < 0.90) return 'high';     // 20% - High mana for magical areas
    return 'very_high';                 // 10% - Very high mana for special areas
  }

  /**
   * Generate random sanctity level
   */
  private generateSanctity(): DungeonDefaults['sanctity'] {
    const roll = this.rng();
    
    // Distribution favoring neutral with extremes being rare
    if (roll < 0.05) return 'cursed';   // 5% - Truly cursed places
    if (roll < 0.20) return 'defiled';  // 15% - Defiled by evil
    if (roll < 0.70) return 'neutral';  // 50% - Most places are neutral
    if (roll < 0.95) return 'blessed';  // 25% - Blessed places
    return 'holy';                      // 5% - Truly holy places
  }

  /**
   * Generate random nature's strength level
   */
  private generateNatureStrength(): DungeonDefaults['nature'] {
    const roll = this.rng();
    
    // Distribution based on how "natural" vs "artificial" the dungeon is
    if (roll < 0.10) return 'dead';     // 10% - Completely artificial/dead
    if (roll < 0.25) return 'weak';     // 15% - Mostly artificial
    if (roll < 0.70) return 'normal';   // 45% - Balance of natural/artificial
    if (roll < 0.90) return 'strong';   // 20% - Natural caves/growth
    return 'primal';                    // 10% - Untouched wilderness
  }

  /**
   * Get description for mana level
   */
  getManaDescription(level: DungeonDefaults['manaLevel']): string {
    switch (level) {
      case 'none': return 'No spells possible, magic items don\'t function';
      case 'low': return 'Spells at -5, double FP cost, halved recovery';
      case 'normal': return 'Standard magical conditions';
      case 'high': return 'Spells at +3, half FP cost, double recovery';
      case 'very_high': return 'Spells at +5, quarter FP cost, triple recovery, critical failure risk';
      default: return 'Unknown mana level';
    }
  }

  /**
   * Get description for sanctity level
   */
  getSanctityDescription(sanctity: DungeonDefaults['sanctity']): string {
    switch (sanctity) {
      case 'cursed': return 'Cursed ground - evil spells enhanced, good spells hindered';
      case 'defiled': return 'Defiled by evil - minor penalty to good spells';
      case 'neutral': return 'Neutral ground - no sanctity effects';
      case 'blessed': return 'Blessed ground - minor bonus to good spells';
      case 'holy': return 'Holy ground - good spells enhanced, evil spells hindered';
      default: return 'Unknown sanctity level';
    }
  }

  /**
   * Get description for nature's strength
   */
  getNatureDescription(nature: DungeonDefaults['nature']): string {
    switch (nature) {
      case 'dead': return 'No natural life - plant/animal spells hindered';
      case 'weak': return 'Sparse nature - minor penalty to nature magic';
      case 'normal': return 'Normal natural presence';
      case 'strong': return 'Abundant nature - minor bonus to nature magic';
      case 'primal': return 'Primal wilderness - nature magic enhanced';
      default: return 'Unknown nature strength';
    }
  }
}