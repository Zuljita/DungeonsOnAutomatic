import type { TreasureHoard } from './DFRPGTreasure';
import expandedTreasureData from './data/expanded-treasure.json';

// DFRPG Treasure Generation Rules Implementation
// Following the exact process from the provided specification

export interface Modifier {
  name: string;
  cf: number;
  eligibleTypes: string[];
  tags?: string[];
  mutuallyExclusive?: string[];
  description: string;
}

export interface Enchantment {
  name: string;
  cost: number;
  baseItems: string[];
  effect: string;
  prefix?: string;
  suffix?: string;
}

export interface GeneratedItem {
  name: string;
  baseItem: string;
  finalCost: number;
  finalWeight: number;
  modifiers: Array<{name: string, cf: number}>;
  enchantments: Array<{name: string, effect: string, cost: number}>;
  category: 'melee_weapon' | 'ranged_weapon' | 'armor' | 'shield' | 'gear';
}

/**
 * DFRPG-compliant treasure generator following the exact rules specification
 */
export class DFRPGTreasureRuleGenerator {
  private rng: () => number;
  private expandedData: any;

  // Modifier definitions following DFRPG rules
  private modifiers: Modifier[] = [
    {
      name: 'Balanced',
      cf: 4,
      eligibleTypes: ['weapon'],
      tags: ['!Fist Load', '!Stick'],
      description: 'Can be applied to any weapon except fist loads and sticks'
    },
    {
      name: 'Climber\'s',
      cf: 4,
      eligibleTypes: ['axe', 'pick'],
      tags: ['One-Handed'],
      description: 'Can be applied to specific one-handed axes, hatchets, picks, juttès, sais, sickles, and tonfas'
    },
    {
      name: 'Dwarven',
      cf: 4,
      eligibleTypes: ['weapon'],
      tags: ['Unbalanced', 'Metal Weapon'],
      description: 'Can be applied to any unbalanced melee weapon'
    },
    {
      name: 'Elven',
      cf: 16,
      eligibleTypes: ['bow'],
      description: 'Can be applied to any bow'
    },
    {
      name: 'Fine',
      cf: 0, // Variable CF based on weapon type
      eligibleTypes: ['weapon', 'armor', 'shield'],
      mutuallyExclusive: ['Very Fine', 'Silver'],
      description: 'CF varies: +2 for projectiles/crushing/impaling, +3 for fencing/swords/bows/crossbows, +9 for cutting'
    },
    {
      name: 'Very Fine',
      cf: 19,
      eligibleTypes: ['weapon'],
      tags: ['Fencing Weapon', 'Sword'],
      mutuallyExclusive: ['Fine', 'Silver'],
      description: 'Only on fencing weapons and swords'
    },
    {
      name: 'Meteoric',
      cf: 19,
      eligibleTypes: ['weapon'],
      tags: ['Metal Weapon'],
      mutuallyExclusive: ['Orichalcum', 'Silver'],
      description: 'Only applies to metal weapons'
    },
    {
      name: 'Orichalcum',
      cf: 29,
      eligibleTypes: ['weapon'],
      tags: ['Metal Weapon'],
      mutuallyExclusive: ['Meteoric', 'Silver'],
      description: 'Only applies to metal weapons'
    },
    {
      name: 'Silver (coated)',
      cf: 2,
      eligibleTypes: ['weapon'],
      tags: ['Metal Weapon'],
      mutuallyExclusive: ['Fine', 'Very Fine', 'Silver (solid)'],
      description: 'Silver coating for metal weapons'
    },
    {
      name: 'Silver (solid)',
      cf: 19,
      eligibleTypes: ['weapon'],
      tags: ['Metal Weapon'],
      mutuallyExclusive: ['Fine', 'Very Fine', 'Meteoric', 'Orichalcum', 'Silver (coated)'],
      description: 'Solid silver weapon'
    },
    {
      name: 'Ornate (+1)',
      cf: 1,
      eligibleTypes: ['weapon', 'armor', 'shield'],
      description: 'Ornate decoration with +1 reaction bonus'
    },
    {
      name: 'Ornate (+2)',
      cf: 4,
      eligibleTypes: ['weapon', 'armor', 'shield'],
      description: 'Ornate decoration with +2 reaction bonus'
    },
    {
      name: 'Ornate (+3)',
      cf: 9,
      eligibleTypes: ['weapon', 'armor', 'shield'],
      description: 'Ornate decoration with +3 reaction bonus'
    },
    {
      name: 'Spiked',
      cf: 2,
      eligibleTypes: ['armor'],
      tags: ['Plate'],
      description: 'Only applies to Plate Armor covering body or more'
    },
    {
      name: 'Thieves\'',
      cf: 3,
      eligibleTypes: ['armor'],
      tags: ['Mail'],
      description: 'Only applies to Mail armor'
    }
  ];

  // Always-On Enchantments following DFRPG rules
  private enchantments: Enchantment[] = [
    {
      name: 'Puissance',
      cost: 15400,
      baseItems: ['Melee Weapon'],
      effect: '+1 to damage',
      prefix: 'Mighty',
      suffix: 'of Smiting'
    },
    {
      name: 'Flaming Weapon',
      cost: 15400,
      baseItems: ['Melee Weapon'],
      effect: '+2 fire damage',
      prefix: 'Flaming',
      suffix: 'of Flame'
    },
    {
      name: 'Accuracy',
      cost: 15400,
      baseItems: ['Ranged Weapon', 'Melee Weapon'],
      effect: '+1 to hit',
      prefix: 'Accurate',
      suffix: 'of Accuracy'
    },
    {
      name: 'Fortify',
      cost: 12000,
      baseItems: ['Armor'],
      effect: '+1 DR',
      prefix: 'Hardened',
      suffix: 'of Protection'
    },
    {
      name: 'Lighten',
      cost: 3000,
      baseItems: ['Armor', 'Shield'],
      effect: 'Reduce weight by 40%',
      prefix: 'Light',
      suffix: 'of Lightness'
    },
    {
      name: 'Deflect',
      cost: 15400,
      baseItems: ['Shield'],
      effect: '+1 to Block',
      prefix: 'Shielding',
      suffix: 'of Deflection'
    }
  ];

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
    this.expandedData = expandedTreasureData;
  }

  /**
   * Generate a single treasure item following DFRPG rules
   */
  generateDFRPGItem(): GeneratedItem {
    // Step 1: Choose an Item Category
    const category = this.selectCategory();
    
    // Step 2: Select a Base Item
    const baseItem = this.selectBaseItem(category);
    
    // Step 3: Apply Modifiers (Cost Factors - CF)
    const { modifiers, totalCF } = this.applyModifiers(baseItem);
    
    // Calculate cost after modifiers
    const modifiedCost = baseItem.value * (1 + totalCF);
    let finalWeight = baseItem.weight;
    
    // Step 4: Apply Enchantments
    const { enchantments, enchantmentCost } = this.applyEnchantments(baseItem, category);
    
    // Final calculations
    const finalCost = modifiedCost + enchantmentCost;
    
    // Apply weight modifications from enchantments (e.g., Lighten)
    enchantments.forEach(ench => {
      if (ench.name === 'Lighten') {
        finalWeight *= 0.6; // Reduce weight by 40%
      }
    });
    
    // Step 5: Construct the Output
    const name = this.constructName(baseItem, modifiers, enchantments);
    
    return {
      name,
      baseItem: baseItem.name,
      finalCost: Math.round(finalCost),
      finalWeight: Math.round(finalWeight * 100) / 100,
      modifiers: modifiers.map(m => ({ name: m.name, cf: m.cf })),
      enchantments: enchantments.map(e => ({ name: e.name, effect: e.effect, cost: e.cost })),
      category: category as any
    };
  }

  private selectCategory(): string {
    const categories = ['melee_weapon', 'ranged_weapon', 'armor', 'shield', 'gear'];
    return categories[Math.floor(this.rng() * categories.length)];
  }

  private selectBaseItem(category: string): any {
    let items: any[] = [];
    
    switch (category) {
      case 'melee_weapon':
      case 'ranged_weapon':
        items = this.expandedData.weapons || [];
        break;
      case 'armor':
        items = this.expandedData.armor || [];
        break;
      case 'shield':
        // Note: We don't have shield data yet, fallback to armor
        items = this.expandedData.armor || [];
        break;
      case 'gear':
        items = this.expandedData.gear || [];
        break;
    }
    
    if (items.length === 0) {
      // Fallback to weapons if no items found
      items = this.expandedData.weapons || [];
    }
    
    return items[Math.floor(this.rng() * items.length)];
  }

  private applyModifiers(baseItem: any): { modifiers: Modifier[], totalCF: number } {
    const appliedModifiers: Modifier[] = [];
    let totalCF = 0;
    
    const appliedNames = new Set<string>();
    
    // Try each modifier with some probability
    for (const modifier of this.modifiers) {
      // Skip if already applied a mutually exclusive modifier
      if (modifier.mutuallyExclusive?.some(name => appliedNames.has(name))) {
        continue;
      }
      
      // Check eligibility
      if (!this.isModifierEligible(modifier, baseItem)) {
        continue;
      }
      
      // Random chance to apply (30% base chance)
      if (this.rng() < 0.3) {
        let cf = modifier.cf;
        
        // Handle variable CF for Fine modifier
        if (modifier.name === 'Fine') {
          cf = this.calculateFineCF(baseItem);
        }
        
        appliedModifiers.push({ ...modifier, cf });
        totalCF += cf;
        appliedNames.add(modifier.name);
        
        // Add mutually exclusive names to the set
        modifier.mutuallyExclusive?.forEach(name => appliedNames.add(name));
      }
    }
    
    return { modifiers: appliedModifiers, totalCF };
  }

  private isModifierEligible(modifier: Modifier, item: any): boolean {
    // Check eligible types
    if (modifier.eligibleTypes.length > 0) {
      const itemCategory = item.category || 'weapon';
      const itemSubcategory = item.subcategory || '';
      
      const hasEligibleType = modifier.eligibleTypes.some(type => 
        itemCategory.includes(type) || itemSubcategory.includes(type)
      );
      
      if (!hasEligibleType) return false;
    }
    
    // Check required tags
    if (modifier.tags) {
      for (const tag of modifier.tags) {
        if (tag.startsWith('!')) {
          // Exclusion tag - item must NOT have this tag
          const excludeTag = tag.substring(1);
          if (item.tags?.includes(excludeTag)) {
            return false;
          }
        } else {
          // Required tag - item must have this tag
          if (!item.tags?.includes(tag)) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  private calculateFineCF(item: any): number {
    const tags = item.tags || [];
    const subcategory = item.subcategory || '';
    
    // +2 for projectiles and crushing/impaling weapons
    if (tags.includes('Projectile') || tags.includes('Crushing') || tags.includes('Impaling')) {
      return 2;
    }
    
    // +3 for fencing weapons, swords, bows, and crossbows
    if (tags.includes('Fencing Weapon') || subcategory === 'sword' || 
        subcategory === 'bow' || subcategory === 'crossbow') {
      return 3;
    }
    
    // +9 for other cutting weapons
    if (tags.includes('Cutting') || subcategory === 'axe' || subcategory === 'knife') {
      return 9;
    }
    
    // Default to +3 for unknown weapon types
    return 3;
  }

  private applyEnchantments(baseItem: any, category: string): { enchantments: Enchantment[], enchantmentCost: number } {
    const appliedEnchantments: Enchantment[] = [];
    let enchantmentCost = 0;
    
    // 20% chance for enchantment
    if (this.rng() < 0.2) {
      // Find eligible enchantments
      const eligibleEnchantments = this.enchantments.filter(ench => {
        return this.isEnchantmentEligible(ench, baseItem, category);
      });
      
      if (eligibleEnchantments.length > 0) {
        const enchantment = eligibleEnchantments[Math.floor(this.rng() * eligibleEnchantments.length)];
        appliedEnchantments.push(enchantment);
        enchantmentCost += enchantment.cost;
      }
    }
    
    return { enchantments: appliedEnchantments, enchantmentCost };
  }

  private isEnchantmentEligible(enchantment: Enchantment, item: any, category: string): boolean {
    const categoryMap: Record<string, string> = {
      'melee_weapon': 'Melee Weapon',
      'ranged_weapon': 'Ranged Weapon',
      'armor': 'Armor',
      'shield': 'Shield',
      'gear': 'Gear'
    };
    
    const itemType = categoryMap[category] || 'Melee Weapon';
    
    return enchantment.baseItems.includes(itemType);
  }

  private constructName(baseItem: any, modifiers: Modifier[], enchantments: Enchantment[]): string {
    let name = baseItem.name;
    
    // Add modifier descriptions
    const modifierNames = modifiers.map(m => m.name).join(', ');
    if (modifierNames) {
      name = `${modifierNames} ${name}`;
    }
    
    // Add enchantment prefixes and suffixes
    enchantments.forEach(ench => {
      if (ench.prefix) {
        name = `${ench.prefix} ${name}`;
      }
      if (ench.suffix) {
        name = `${name} ${ench.suffix}`;
      }
    });
    
    // Add article if enchanted
    if (enchantments.length > 0) {
      name = `A ${name}`;
    }
    
    return name;
  }

  /**
   * Generate a treasure hoard using DFRPG rules
   */
  generateDFRPGTreasureHoard(
    level: number,
    hoardSize: 'small' | 'medium' | 'large' | 'vast' = 'medium'
  ): TreasureHoard {
    const coins = this.generateCoins(level, hoardSize);
    const items: GeneratedItem[] = [];
    
    // Determine number of items to generate based on hoard size
    const itemCounts = {
      small: [0, 1, 1, 2],
      medium: [1, 2, 2, 3],
      large: [2, 3, 3, 4],
      vast: [3, 4, 5, 6]
    };
    
    const possibleCounts = itemCounts[hoardSize];
    const itemCount = possibleCounts[Math.floor(this.rng() * possibleCounts.length)];
    
    // Generate items
    for (let i = 0; i < itemCount; i++) {
      items.push(this.generateDFRPGItem());
    }
    
    // Convert to the expected format
    const magicItems = items.filter(item => item.enchantments.length > 0).map(item => ({
      name: item.name,
      category: 'accessory' as const,
      powerLevel: item.finalCost > 10000 ? 'epic' as const : item.finalCost > 2000 ? 'major' as const : 'minor' as const,
      reference: 'DFRPG Equipment',
      quirks: item.modifiers.map(m => m.name),
      value: item.finalCost,
      weight: item.finalWeight
    }));
    
    const mundaneItems = items.filter(item => item.enchantments.length === 0).map(item => ({
      name: item.name,
      category: 'other' as const,
      value: item.finalCost,
      weight: item.finalWeight,
      description: `${item.baseItem} with ${item.modifiers.map(m => m.name).join(', ') || 'no'} modifications`
    }));
    
    const totalValue = coins.totalValue + 
      magicItems.reduce((sum, item) => sum + item.value, 0) +
      mundaneItems.reduce((sum, item) => sum + item.value, 0);
    
    const totalWeight = coins.totalWeight +
      magicItems.reduce((sum, item) => sum + item.weight, 0) +
      mundaneItems.reduce((sum, item) => sum + item.weight, 0);
    
    return {
      coins,
      magicItems,
      mundaneItems,
      totalValue,
      totalWeight
    };
  }

  private generateCoins(level: number, hoardSize: string): any {
    let baseValue = 50 * level;
    
    const hoardMultipliers: Record<string, number> = { small: 0.5, medium: 1.0, large: 1.5, vast: 2.5 };
    baseValue *= hoardMultipliers[hoardSize] || 1.0;
    
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
}