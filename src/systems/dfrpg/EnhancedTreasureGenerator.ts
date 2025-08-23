import type { TreasureHoard } from './DFRPGTreasure';
import expandedTreasureData from './data/expanded-treasure.json';
import { DFRPGTreasureRuleGenerator, type GeneratedItem } from './DFRPGTreasureRules';

export type TreasureRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
export type TreasureTheme = 'default' | 'warrior' | 'wizard' | 'thief' | 'holy' | 'nature' | 'undead';

interface MagicItem {
  name: string;
  category: 'weapon' | 'armor' | 'potion' | 'scroll' | 'power_item' | 'accessory';
  powerLevel: 'minor' | 'major' | 'epic';
  reference?: string;
  quirks?: string[];
  value: number;
  weight: number;
}

interface MundaneValuable {
  name: string;
  category: 'trade_good' | 'art' | 'gem' | 'tool' | 'other';
  value: number;
  weight: number;
  description?: string;
}

export interface EnhancedTreasureOptions {
  /** Wealth level multiplier */
  wealthLevel?: 'poor' | 'average' | 'wealthy' | 'rich';
  /** Magic item frequency multiplier */
  magicItemFrequency?: number;
  /** Use expanded treasure data */
  useExpandedData?: boolean;
  /** Use DFRPG rules-compliant generation with Cost Factors and enchantments */
  useDFRPGRules?: boolean;
  /** Treasure theme for cohesive hoards */
  treasureTheme?: TreasureTheme;
  /** Target total value for balanced encounters */
  targetValue?: number;
  /** Minimum rarity for items */
  minimumRarity?: TreasureRarity;
  /** Maximum rarity for items */
  maximumRarity?: TreasureRarity;
  /** Favor specific item categories */
  preferredCategories?: string[];
}

interface TreasureItem {
  name: string;
  category: string;
  subcategory: string;
  value: number;
  weight: number;
  tags: string[];
  rarity: TreasureRarity;
  powerLevel?: 'minor' | 'major' | 'epic';
  dr?: number;
}

/**
 * Enhanced treasure generator with expanded DFRPG data and customization options
 */
export class EnhancedTreasureGenerator {
  private rng: () => number;
  private expandedData: {
    weapons: TreasureItem[];
    armor: TreasureItem[];
    gear: TreasureItem[];
    magicItems: TreasureItem[];
    rarityThresholds: Record<TreasureRarity, { min: number; max: number }>;
  };
  private dfrpgRulesGenerator: DFRPGTreasureRuleGenerator;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
    this.expandedData = expandedTreasureData as any;
    this.dfrpgRulesGenerator = new DFRPGTreasureRuleGenerator(rng);
  }

  /**
   * Generate enhanced treasure hoard with expanded data
   */
  generateEnhancedTreasureHoard(
    level: number,
    hoardSize: 'small' | 'medium' | 'large' | 'vast' = 'medium',
    options: EnhancedTreasureOptions = {}
  ): TreasureHoard {
    const {
      wealthLevel = 'average',
      magicItemFrequency = 1.0,
      useExpandedData = true,
      useDFRPGRules = false,
      treasureTheme = 'default',
      minimumRarity = 'common',
      maximumRarity = 'legendary',
      preferredCategories = []
    } = options;

    // Use DFRPG rules-compliant generator if requested
    if (useDFRPGRules) {
      return this.dfrpgRulesGenerator.generateDFRPGTreasureHoard(level, hoardSize);
    }

    // Generate base coin amount
    const coins = this.generateCoins(level, hoardSize, wealthLevel);
    
    const magicItems: MagicItem[] = [];
    const mundaneItems: MundaneValuable[] = [];

    if (useExpandedData) {
      // Enhanced generation with expanded data
      const magicItemCount = this.calculateMagicItemCount(level, hoardSize, magicItemFrequency);
      const mundaneItemCount = this.calculateMundaneItemCount(level, hoardSize);

      // Generate magic items
      for (let i = 0; i < magicItemCount; i++) {
        const magicItem = this.generateMagicItemFromExpanded(level, treasureTheme, minimumRarity, maximumRarity);
        if (magicItem) {
          magicItems.push(magicItem);
        }
      }

      // Generate mundane items
      for (let i = 0; i < mundaneItemCount; i++) {
        const mundaneItem = this.generateMundaneItemFromExpanded(level, treasureTheme, minimumRarity, maximumRarity, preferredCategories);
        if (mundaneItem) {
          mundaneItems.push(mundaneItem);
        }
      }
    }

    // Calculate totals
    const magicItemsValue = magicItems.reduce((sum, item) => sum + item.value, 0);
    const mundaneItemsValue = mundaneItems.reduce((sum, item) => sum + item.value, 0);
    const totalValue = coins.totalValue + magicItemsValue + mundaneItemsValue;
    
    const magicItemsWeight = magicItems.reduce((sum, item) => sum + item.weight, 0);
    const mundaneItemsWeight = mundaneItems.reduce((sum, item) => sum + item.weight, 0);
    const totalWeight = coins.totalWeight + magicItemsWeight + mundaneItemsWeight;

    return {
      coins,
      magicItems,
      mundaneItems,
      totalValue,
      totalWeight
    };
  }

  /**
   * Generate themed treasure based on dungeon/encounter type
   */
  generateThemedTreasure(theme: TreasureTheme, value: number, level: number): TreasureHoard {
    const preferredCategories = this.getThemeCategories(theme);
    const minimumRarity = this.getThemeMinimumRarity(theme, level);
    
    return this.generateEnhancedTreasureHoard(level, 'medium', {
      targetValue: value,
      treasureTheme: theme,
      preferredCategories,
      minimumRarity,
      useExpandedData: true
    });
  }

  /**
   * Generate a single DFRPG rules-compliant item
   */
  generateDFRPGItem(): GeneratedItem {
    return this.dfrpgRulesGenerator.generateDFRPGItem();
  }

  private generateCoins(level: number, hoardSize: string, wealthLevel: string): any {
    // Simplified coin generation - could be expanded
    let baseValue = 100 * level;
    
    // Apply hoard size multiplier
    const hoardMultipliers: Record<string, number> = { small: 0.5, medium: 1.0, large: 1.5, vast: 2.5 };
    baseValue *= hoardMultipliers[hoardSize] || 1.0;
    
    // Apply wealth level multiplier
    const wealthMultipliers: Record<string, number> = { poor: 0.6, average: 1.0, wealthy: 1.4, rich: 2.0 };
    baseValue *= wealthMultipliers[wealthLevel] || 1.0;
    
    // Distribute among coin types
    const goldCoins = Math.floor(baseValue / 5);
    const silverCoins = Math.floor((baseValue % 5) * 10);
    const copperCoins = Math.floor(((baseValue % 5) * 10) % 1 * 100);
    
    return {
      copper: copperCoins,
      silver: silverCoins,
      gold: goldCoins,
      totalValue: Math.round(baseValue),
      totalWeight: (goldCoins * 0.01) + (silverCoins * 0.01) + (copperCoins * 0.01)
    };
  }

  private calculateMagicItemCount(level: number, hoardSize: string, frequency: number): number {
    const baseChance = Math.min(0.1 + (level * 0.05), 0.8) * frequency;
    const hoardBonuses: Record<string, number> = { small: 0, medium: 0.1, large: 0.2, vast: 0.3 };
    const adjustedChance = Math.min(baseChance + (hoardBonuses[hoardSize] || 0), 0.9);
    
    if (this.rng() < adjustedChance) {
      return Math.min(Math.floor(1 + this.rng() * Math.min(level / 2, 3)), 5);
    }
    return 0;
  }

  private calculateMundaneItemCount(level: number, hoardSize: string): number {
    const baseChance = 0.4 + (level * 0.03);
    const hoardBonuses: Record<string, number> = { small: 0, medium: 1, large: 2, vast: 4 };
    
    if (this.rng() < baseChance) {
      return 1 + Math.floor(this.rng() * 3) + (hoardBonuses[hoardSize] || 0);
    }
    return 0;
  }

  private generateMagicItemFromExpanded(
    level: number, 
    theme: TreasureTheme, 
    minRarity: TreasureRarity, 
    maxRarity: TreasureRarity
  ): MagicItem | null {
    // Filter magic items by rarity range
    const availableItems = this.expandedData.magicItems.filter(item => 
      this.isRarityInRange(item.rarity, minRarity, maxRarity)
    );
    
    if (availableItems.length === 0) return null;
    
    // Apply theme filtering if applicable
    const themedItems = theme === 'default' ? availableItems : 
      this.filterItemsByTheme(availableItems, theme);
    
    const selectedItems = themedItems.length > 0 ? themedItems : availableItems;
    const item = selectedItems[Math.floor(this.rng() * selectedItems.length)];
    
    return {
      name: item.name,
      category: item.subcategory as any,
      powerLevel: item.powerLevel || this.determinePowerLevelFromValue(item.value),
      reference: `DFRPG Equipment`,
      quirks: this.generateQuirksForItem(item, theme),
      value: item.value,
      weight: item.weight
    };
  }

  private generateMundaneItemFromExpanded(
    level: number,
    theme: TreasureTheme,
    minRarity: TreasureRarity,
    maxRarity: TreasureRarity,
    preferredCategories: string[]
  ): MundaneValuable | null {
    // Combine weapons, armor, and gear
    const allMundaneItems = [
      ...this.expandedData.weapons,
      ...this.expandedData.armor,
      ...this.expandedData.gear
    ];
    
    // Filter by rarity range
    let availableItems = allMundaneItems.filter(item => 
      this.isRarityInRange(item.rarity, minRarity, maxRarity)
    );
    
    // Apply category preferences
    if (preferredCategories.length > 0) {
      const preferredItems = availableItems.filter(item => 
        preferredCategories.includes(item.category) || preferredCategories.includes(item.subcategory)
      );
      if (preferredItems.length > 0) {
        availableItems = preferredItems;
      }
    }
    
    // Apply theme filtering
    if (theme !== 'default') {
      const themedItems = this.filterItemsByTheme(availableItems, theme);
      if (themedItems.length > 0) {
        availableItems = themedItems;
      }
    }
    
    if (availableItems.length === 0) return null;
    
    const item = availableItems[Math.floor(this.rng() * availableItems.length)];
    
    return {
      name: item.name,
      category: this.mapToMundaneCategory(item.category, item.subcategory),
      value: item.value,
      weight: item.weight,
      description: this.generateItemDescription(item, theme)
    };
  }

  private isRarityInRange(itemRarity: TreasureRarity, minRarity: TreasureRarity, maxRarity: TreasureRarity): boolean {
    const rarityOrder: TreasureRarity[] = ['common', 'uncommon', 'rare', 'very_rare', 'legendary'];
    const itemIndex = rarityOrder.indexOf(itemRarity);
    const minIndex = rarityOrder.indexOf(minRarity);
    const maxIndex = rarityOrder.indexOf(maxRarity);
    
    return itemIndex >= minIndex && itemIndex <= maxIndex;
  }

  private getThemeCategories(theme: TreasureTheme): string[] {
    const themeMap: Record<TreasureTheme, string[]> = {
      default: [],
      warrior: ['weapon', 'armor', 'shield'],
      wizard: ['magic', 'gear', 'book', 'scroll'],
      thief: ['tool', 'poison', 'gear', 'knife'],
      holy: ['religious', 'gear', 'armor'],
      nature: ['gear', 'consumable', 'stick'],
      undead: ['weapon', 'armor', 'poison']
    };
    
    return themeMap[theme] || [];
  }

  private getThemeMinimumRarity(theme: TreasureTheme, level: number): TreasureRarity {
    if (theme === 'wizard' || theme === 'holy') {
      return level >= 5 ? 'uncommon' : 'common';
    }
    return 'common';
  }

  private filterItemsByTheme(items: TreasureItem[], theme: TreasureTheme): TreasureItem[] {
    const themeKeywords: Record<TreasureTheme, string[]> = {
      default: [],
      warrior: ['weapon', 'armor', 'shield', 'sword', 'axe', 'mace'],
      wizard: ['magic', 'spell', 'scroll', 'staff', 'wand', 'tome', 'book'],
      thief: ['lockpicks', 'poison', 'knife', 'dagger', 'tool', 'trap'],
      holy: ['holy', 'blessed', 'religious', 'symbol', 'sacred'],
      nature: ['wooden', 'natural', 'fur', 'leather', 'stick', 'staff'],
      undead: ['bone', 'skull', 'dark', 'cursed', 'shadow']
    };
    
    const keywords = themeKeywords[theme] || [];
    if (keywords.length === 0) return items;
    
    return items.filter(item => {
      const searchText = (item.name + ' ' + item.category + ' ' + item.subcategory + ' ' + item.tags.join(' ')).toLowerCase();
      return keywords.some((keyword: string) => searchText.includes(keyword.toLowerCase()));
    });
  }

  private determinePowerLevelFromValue(value: number): 'minor' | 'major' | 'epic' {
    if (value >= 10000) return 'epic';
    if (value >= 2000) return 'major';
    return 'minor';
  }

  private generateQuirksForItem(item: TreasureItem, theme: TreasureTheme): string[] {
    const baseQuirks = ['Well-crafted', 'Shows signs of use', 'Ornate design', 'Foreign make'];
    const themeQuirks: Record<TreasureTheme, string[]> = {
      default: [],
      warrior: ['Battle-tested', 'Bears heraldic symbols', 'Weapon shows nicks from combat'],
      wizard: ['Faintly magical aura', 'Inscribed with arcane symbols', 'Hums with power'],
      thief: ['Designed for stealth', 'Hidden compartments', 'Silent operation'],
      holy: ['Blessed by priests', 'Sacred symbols', 'Radiates holy energy'],
      nature: ['Made from natural materials', 'Decorated with leaves', 'Smells of earth'],
      undead: ['Tainted by evil', 'Cursed appearance', 'Chills to the touch']
    };
    
    const availableQuirks = [...baseQuirks, ...(themeQuirks[theme] || [])];
    
    // 30% chance for a quirk
    if (this.rng() < 0.3) {
      return [availableQuirks[Math.floor(this.rng() * availableQuirks.length)]];
    }
    
    return [];
  }

  private mapToMundaneCategory(category: string, subcategory: string): MundaneValuable['category'] {
    if (category === 'weapon') return 'other';
    if (category === 'armor') return 'other';
    if (subcategory === 'tool') return 'tool';
    if (subcategory === 'religious' || subcategory === 'book') return 'art';
    if (subcategory === 'container' || subcategory === 'gem') return 'gem';
    return 'trade_good';
  }

  private generateItemDescription(item: TreasureItem, theme: TreasureTheme): string {
    const condition = this.rng() < 0.7 ? 'good condition' : this.rng() < 0.5 ? 'well-maintained' : 'showing wear';
    const themeDescriptions: Record<TreasureTheme, string> = {
      default: '',
      warrior: 'from a warrior\'s equipment',
      wizard: 'from a scholar\'s collection',
      thief: 'from a rogue\'s kit',
      holy: 'of religious significance',
      nature: 'crafted by nature spirits',
      undead: 'with an ominous aura'
    };
    
    const base = `${item.name} in ${condition}`;
    const themeDesc = themeDescriptions[theme];
    
    return themeDesc ? `${base}, ${themeDesc}` : base;
  }
}