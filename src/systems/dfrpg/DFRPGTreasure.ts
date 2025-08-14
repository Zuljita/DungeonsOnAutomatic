interface CoinAmount {
  copper: number;
  silver: number;
  gold: number;
  goldHalf?: number;
  goldQuarter?: number;
  goldFifth?: number;
  platinum?: number;
  billon?: number;
  tumbaga?: number;
  electrum?: number;
  totalValue: number;
  totalWeight: number;
}

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

interface TreasureHoard {
  coins: CoinAmount;
  magicItems: MagicItem[];
  mundaneItems: MundaneValuable[];
  totalValue: number;
  totalWeight: number;
}

const COIN_VALUES = {
  copper: { value: 1, weight: 0.02 },
  silver: { value: 20, weight: 0.02 },
  gold: { value: 400, weight: 0.02 },
  goldHalf: { value: 200, weight: 0.01 },
  goldQuarter: { value: 100, weight: 0.005 },
  goldFifth: { value: 80, weight: 0.004 },
  platinum: { value: 800, weight: 0.02, reference: 'Exploits p.73' },
  billon: { value: 10, weight: 0.02, reference: 'Exploits p.73' },
  tumbaga: { value: 60, weight: 0.02, reference: 'Exploits p.73' },
  electrum: { value: 200, weight: 0.02, reference: 'Exploits p.73' }
};

const MAGIC_ITEM_TEMPLATES = {
  minor: {
    weapons: [
      { name: 'Enchanted Dagger +1', value: 1000, weight: 0.5, quirks: ['Glows faintly in darkness'] },
      { name: 'Silver-Blessed Sword', value: 800, weight: 3, quirks: ['Extra damage vs undead'] },
      { name: 'Quick-Draw Bow', value: 1200, weight: 2, quirks: ['Ready maneuver is Free Action'] }
    ],
    armor: [
      { name: 'Leather Armor +1', value: 600, weight: 10, quirks: ['Self-cleaning'] },
      { name: 'Shield of Deflection', value: 1000, weight: 8, quirks: ['Parry at no penalty vs missiles'] },
      { name: 'Cloak of Resistance', value: 800, weight: 2, quirks: ['+1 to all resistance rolls'] }
    ],
    potions: [
      { name: 'Potion of Minor Healing', value: 50, weight: 0.25, quirks: ['Heals 1d HP'] },
      { name: 'Potion of Strength', value: 100, weight: 0.25, quirks: ['+2 ST for 1 hour'] },
      { name: 'Antidote', value: 75, weight: 0.25, quirks: ['Neutralizes most poisons'] }
    ],
    scrolls: [
      { name: 'Scroll of Light', value: 25, weight: 0.1, quirks: ['Single use spell'] },
      { name: 'Scroll of Healing', value: 100, weight: 0.1, quirks: ['Heals 1d+1 HP'] },
      { name: 'Scroll of Unlock', value: 150, weight: 0.1, quirks: ['Opens any normal lock'] }
    ],
    power_items: [
      { name: 'Power Stone (1 point)', value: 100, weight: 0.1, quirks: ['Provides 1 mana'] },
      { name: 'Mana Battery (2 points)', value: 300, weight: 0.25, quirks: ['Provides 2 mana, recharges daily'] }
    ],
    accessories: [
      { name: 'Ring of Protection +1', value: 800, weight: 0, quirks: ['+1 to all defenses'] },
      { name: 'Boots of Quiet', value: 600, weight: 2, quirks: ['+2 to Stealth'] },
      { name: 'Amulet of Alert', value: 400, weight: 0.1, quirks: ['+2 to surprise rolls'] }
    ]
  },
  major: {
    weapons: [
      { name: 'Enchanted Sword +2', value: 5000, weight: 3, quirks: ['Sheds bright light on command'] },
      { name: 'Flaming Weapon', value: 8000, weight: 3, quirks: ['Does +1d burning damage'] },
      { name: 'Vorpal Blade', value: 12000, weight: 3, quirks: ['Critical hits may sever limbs'] }
    ],
    armor: [
      { name: 'Enchanted Mail +2', value: 4000, weight: 20, quirks: ['No maintenance required'] },
      { name: 'Armor of Spell Resistance', value: 6000, weight: 25, quirks: ['+3 vs spells'] },
      { name: 'Mithril Shirt', value: 10000, weight: 5, quirks: ['Fine quality, no stealth penalty'] }
    ],
    power_items: [
      { name: 'Staff of Power (10 points)', value: 2000, weight: 4, quirks: ['10 mana, recharges daily'] },
      { name: 'Crystal of Mana (15 points)', value: 4000, weight: 1, quirks: ['15 mana, slow recharge'] }
    ]
  },
  epic: {
    weapons: [
      { name: 'Legendary Blade +3', value: 25000, weight: 3, quirks: ['Intelligent', 'Speaks Common', 'Detects enemies'] },
      { name: 'Dragonslayer Sword', value: 30000, weight: 4, quirks: ['2x damage vs dragons', 'Fire immunity'] }
    ],
    armor: [
      { name: 'Plate of the Gods +3', value: 20000, weight: 45, quirks: ['Immune to critical hits', 'Self-repairing'] }
    ]
  }
};

const MUNDANE_VALUABLES = {
  trade_goods: [
    { name: 'Bolt of Fine Silk', value: 200, weight: 5, description: 'High quality fabric from distant lands' },
    { name: 'Exotic Spices (1 lb)', value: 150, weight: 1, description: 'Rare spices worth their weight in silver' },
    { name: 'Quality Furs', value: 300, weight: 8, description: 'Pelts from rare northern animals' },
    { name: 'Medicinal Herbs', value: 100, weight: 2, description: 'Useful for alchemy and healing' },
    { name: 'Ivory Tusk', value: 500, weight: 10, description: 'Carved with intricate designs' }
  ],
  art: [
    { name: 'Golden Idol', value: 800, weight: 3, description: 'Ancient religious artifact' },
    { name: 'Jeweled Goblet', value: 600, weight: 1, description: 'Encrusted with semi-precious stones' },
    { name: 'Ornate Mirror', value: 400, weight: 5, description: 'Silver-backed with golden frame' },
    { name: 'Masterwork Painting', value: 1000, weight: 2, description: 'Portrait by a famous artist' },
    { name: 'Decorative Armor', value: 1200, weight: 25, description: 'Ceremonial plate, too ornate for battle' }
  ],
  gems: [
    { name: 'Ruby', value: 1000, weight: 0, description: 'Deep red, perfectly cut' },
    { name: 'Sapphire', value: 800, weight: 0, description: 'Clear blue, flawless' },
    { name: 'Emerald', value: 1200, weight: 0, description: 'Vibrant green, rare quality' },
    { name: 'Diamond', value: 2000, weight: 0, description: 'Brilliant cut, exceptional clarity' },
    { name: 'Pearls (strand)', value: 400, weight: 0.1, description: 'Perfectly matched set' },
    { name: 'Garnet', value: 200, weight: 0, description: 'Deep red, good quality' },
    { name: 'Amethyst', value: 300, weight: 0, description: 'Purple crystal, well-formed' }
  ],
  tools: [
    { name: 'Masterwork Tools', value: 300, weight: 5, description: 'Fine quality craftsman tools (+1 to skill)' },
    { name: 'Thieves\' Tools (fine)', value: 200, weight: 1, description: 'Professional lockpicking kit (+1 to skill)' },
    { name: 'Portable Alchemy Kit', value: 400, weight: 10, description: 'Complete alchemical apparatus' }
  ]
};

const QUIRK_TABLES = {
  beneficial: [
    'Self-cleaning and maintenance-free',
    'Glows softly when desired (no energy cost)',
    'Warns of nearby enemies (within 10 yards)',
    'Provides +1 to reaction rolls',
    'Comfortable in any weather',
    'Cannot be stolen (returns to owner)',
    'Weighs half normal amount'
  ],
  neutral: [
    'Changes color based on owner\'s mood',
    'Whispers in ancient language',
    'Feels warm to the touch',
    'Leaves no footprints when worn',
    'Attracts small animals',
    'Smells faintly of roses',
    'Casts no shadow'
  ],
  detrimental: [
    'Requires daily prayer/meditation (15 minutes)',
    'Cannot be used by opposite alignment',
    'Dims other light sources nearby',
    'Makes noise when enemies approach',
    'Jealous of other magic items',
    'Randomly activates at inconvenient times',
    'Cursed: difficult to remove (-3 to attempts)'
  ]
};

export class DFRPGTreasureGenerator {
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  generateCoins(level: number, hoardSize: 'small' | 'medium' | 'large' | 'vast' = 'medium'): CoinAmount {
    const baseValue = this.getBaseValueForLevel(level);
    const multiplier = this.getHoardMultiplier(hoardSize);
    const totalValue = Math.floor(baseValue * multiplier * (0.5 + this.rng()));

    // Initialize all coin types
    const coins = {
      copper: 0,
      silver: 0,
      gold: 0,
      goldHalf: 0,
      goldQuarter: 0,
      goldFifth: 0,
      platinum: 0,
      billon: 0,
      tumbaga: 0,
      electrum: 0
    };

    let remainingValue = totalValue;

    // Generate exotic coins first (rare, high-level hoards)
    if (level >= 8 && hoardSize !== 'small' && this.rng() < 0.3) {
      if (this.rng() < 0.1) { // Platinum - very rare
        coins.platinum = Math.floor(this.rng() * 3) + 1;
        remainingValue -= coins.platinum * COIN_VALUES.platinum.value;
      }
      if (this.rng() < 0.2) { // Electrum - uncommon
        coins.electrum = Math.floor(this.rng() * 5) + 1;
        remainingValue -= coins.electrum * COIN_VALUES.electrum.value;
      }
      if (this.rng() < 0.15) { // Tumbaga - rare
        coins.tumbaga = Math.floor(this.rng() * 4) + 1;
        remainingValue -= coins.tumbaga * COIN_VALUES.tumbaga.value;
      }
      if (this.rng() < 0.25) { // Billon - more common than others
        coins.billon = Math.floor(this.rng() * 8) + 1;
        remainingValue -= coins.billon * COIN_VALUES.billon.value;
      }
    }

    remainingValue = Math.max(0, remainingValue);

    // Standard coin distribution
    const goldRatio = 0.15 + (level * 0.02); // More gold at deeper levels
    const silverRatio = 0.35;
    const copperRatio = 1 - goldRatio - silverRatio;

    const goldValue = Math.floor(remainingValue * goldRatio);
    const silverValue = Math.floor(remainingValue * silverRatio);
    const copperValue = remainingValue - goldValue - silverValue;

    // Generate gold coins (sometimes as fractions)
    let goldRemaining = goldValue;
    coins.gold = Math.floor(goldRemaining / COIN_VALUES.gold.value);
    goldRemaining -= coins.gold * COIN_VALUES.gold.value;

    // Use fractional gold for smaller amounts
    if (goldRemaining >= COIN_VALUES.goldHalf.value && this.rng() < 0.4) {
      coins.goldHalf = Math.floor(goldRemaining / COIN_VALUES.goldHalf.value);
      goldRemaining -= coins.goldHalf * COIN_VALUES.goldHalf.value;
    }
    if (goldRemaining >= COIN_VALUES.goldQuarter.value && this.rng() < 0.3) {
      coins.goldQuarter = Math.floor(goldRemaining / COIN_VALUES.goldQuarter.value);
      goldRemaining -= coins.goldQuarter * COIN_VALUES.goldQuarter.value;
    }
    if (goldRemaining >= COIN_VALUES.goldFifth.value && this.rng() < 0.2) {
      coins.goldFifth = Math.floor(goldRemaining / COIN_VALUES.goldFifth.value);
      goldRemaining -= coins.goldFifth * COIN_VALUES.goldFifth.value;
    }

    // Generate silver and copper
    coins.silver = Math.floor(silverValue / COIN_VALUES.silver.value);
    coins.copper = Math.floor(copperValue / COIN_VALUES.copper.value);

    // Calculate totals
    const actualValue = (coins.copper * COIN_VALUES.copper.value) +
                       (coins.silver * COIN_VALUES.silver.value) +
                       (coins.gold * COIN_VALUES.gold.value) +
                       (coins.goldHalf * COIN_VALUES.goldHalf.value) +
                       (coins.goldQuarter * COIN_VALUES.goldQuarter.value) +
                       (coins.goldFifth * COIN_VALUES.goldFifth.value) +
                       (coins.platinum * COIN_VALUES.platinum.value) +
                       (coins.billon * COIN_VALUES.billon.value) +
                       (coins.tumbaga * COIN_VALUES.tumbaga.value) +
                       (coins.electrum * COIN_VALUES.electrum.value);

    const totalWeight = (coins.copper * COIN_VALUES.copper.weight) +
                       (coins.silver * COIN_VALUES.silver.weight) +
                       (coins.gold * COIN_VALUES.gold.weight) +
                       (coins.goldHalf * COIN_VALUES.goldHalf.weight) +
                       (coins.goldQuarter * COIN_VALUES.goldQuarter.weight) +
                       (coins.goldFifth * COIN_VALUES.goldFifth.weight) +
                       (coins.platinum * COIN_VALUES.platinum.weight) +
                       (coins.billon * COIN_VALUES.billon.weight) +
                       (coins.tumbaga * COIN_VALUES.tumbaga.weight) +
                       (coins.electrum * COIN_VALUES.electrum.weight);

    return {
      ...coins,
      totalValue: actualValue,
      totalWeight
    };
  }

  generateMagicItem(level: number, powerLevel?: 'minor' | 'major' | 'epic'): MagicItem {
    if (!powerLevel) {
      powerLevel = this.determinePowerLevel(level);
    }

    const categories = Object.keys(MAGIC_ITEM_TEMPLATES[powerLevel]);
    const category = categories[Math.floor(this.rng() * categories.length)] as keyof typeof MAGIC_ITEM_TEMPLATES.minor;
    const items = MAGIC_ITEM_TEMPLATES[powerLevel][category];
    const template = items[Math.floor(this.rng() * items.length)];

    const quirks = [...template.quirks];
    
    // 30% chance for additional quirk
    if (this.rng() < 0.3) {
      const quirkType = this.rng() < 0.1 ? 'detrimental' : (this.rng() < 0.5 ? 'neutral' : 'beneficial');
      const additionalQuirk = QUIRK_TABLES[quirkType][Math.floor(this.rng() * QUIRK_TABLES[quirkType].length)];
      quirks.push(additionalQuirk);
    }

    return {
      name: template.name,
      category: category as MagicItem['category'],
      powerLevel,
      reference: powerLevel === 'minor' ? 'DFRPG Magic Items p.XX' : undefined,
      quirks,
      value: template.value,
      weight: template.weight
    };
  }

  generateMundaneValuable(level: number): MundaneValuable {
    const categories = Object.keys(MUNDANE_VALUABLES);
    const category = categories[Math.floor(this.rng() * categories.length)] as keyof typeof MUNDANE_VALUABLES;
    const items = MUNDANE_VALUABLES[category];
    const item = items[Math.floor(this.rng() * items.length)];

    // Adjust value based on level (±25%)
    const valueModifier = 0.75 + (0.5 * this.rng()) + (level * 0.05);
    const adjustedValue = Math.floor(item.value * valueModifier);

    return {
      name: item.name,
      category: category as MundaneValuable['category'],
      value: adjustedValue,
      weight: item.weight,
      description: item.description
    };
  }

  generateTreasureHoard(level: number, hoardSize: 'small' | 'medium' | 'large' | 'vast' = 'medium'): TreasureHoard {
    const coins = this.generateCoins(level, hoardSize);
    const magicItems: MagicItem[] = [];
    const mundaneItems: MundaneValuable[] = [];

    // Magic item chances based on level and hoard size
    const magicChance = Math.min(0.1 + (level * 0.05) + this.getHoardMagicBonus(hoardSize), 0.8);
    const magicItemCount = this.rng() < magicChance ? 
      Math.floor(1 + this.rng() * Math.min(level / 2, 3)) : 0;

    for (let i = 0; i < magicItemCount; i++) {
      magicItems.push(this.generateMagicItem(level));
    }

    // Mundane valuable chances
    const mundaneChance = 0.3 + (level * 0.02);
    const mundaneCount = this.rng() < mundaneChance ? 
      Math.floor(1 + this.rng() * 3) : 0;

    for (let i = 0; i < mundaneCount; i++) {
      mundaneItems.push(this.generateMundaneValuable(level));
    }

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

  private getBaseValueForLevel(level: number): number {
    // Adjusted for higher GURPS coin values
    return 25 + (level * 40) + (level * level * 15);
  }

  private getHoardMultiplier(size: 'small' | 'medium' | 'large' | 'vast'): number {
    const multipliers = { small: 0.5, medium: 1.0, large: 2.0, vast: 4.0 };
    return multipliers[size];
  }

  private getHoardMagicBonus(size: 'small' | 'medium' | 'large' | 'vast'): number {
    const bonuses = { small: 0, medium: 0.1, large: 0.2, vast: 0.3 };
    return bonuses[size];
  }

  private determinePowerLevel(level: number): 'minor' | 'major' | 'epic' {
    if (level <= 3) return 'minor';
    if (level <= 8) {
      return this.rng() < 0.7 ? 'minor' : 'major';
    }
    if (level <= 12) {
      const roll = this.rng();
      if (roll < 0.4) return 'minor';
      if (roll < 0.85) return 'major';
      return 'epic';
    }
    // Level 13+
    const roll = this.rng();
    if (roll < 0.2) return 'minor';
    if (roll < 0.7) return 'major';
    return 'epic';
  }

  formatTreasureDescription(hoard: TreasureHoard): string {
    const parts: string[] = [];

    // Coins
    if (hoard.coins.totalValue > 0) {
      const coinParts: string[] = [];
      if (hoard.coins.platinum && hoard.coins.platinum > 0) {
        coinParts.push(`${hoard.coins.platinum} platinum (Exploits p.73)`);
      }
      if (hoard.coins.gold > 0) coinParts.push(`${hoard.coins.gold} gold`);
      if (hoard.coins.goldHalf && hoard.coins.goldHalf > 0) {
        coinParts.push(`${hoard.coins.goldHalf} gold halves`);
      }
      if (hoard.coins.goldQuarter && hoard.coins.goldQuarter > 0) {
        coinParts.push(`${hoard.coins.goldQuarter} gold quarters`);
      }
      if (hoard.coins.goldFifth && hoard.coins.goldFifth > 0) {
        coinParts.push(`${hoard.coins.goldFifth} gold fifths`);
      }
      if (hoard.coins.electrum && hoard.coins.electrum > 0) {
        coinParts.push(`${hoard.coins.electrum} electrum (Exploits p.73)`);
      }
      if (hoard.coins.tumbaga && hoard.coins.tumbaga > 0) {
        coinParts.push(`${hoard.coins.tumbaga} tumbaga (Exploits p.73)`);
      }
      if (hoard.coins.silver > 0) coinParts.push(`${hoard.coins.silver} silver`);
      if (hoard.coins.billon && hoard.coins.billon > 0) {
        coinParts.push(`${hoard.coins.billon} billon (Exploits p.73)`);
      }
      if (hoard.coins.copper > 0) coinParts.push(`${hoard.coins.copper} copper`);
      parts.push(`Coins: ${coinParts.join(', ')} (${hoard.coins.totalWeight.toFixed(2)} lbs)`);
    }

    // Magic items
    if (hoard.magicItems.length > 0) {
      const magicDesc = hoard.magicItems.map(item => 
        `${item.name} (${item.powerLevel}, ${item.quirks.join(', ')})`
      ).join('; ');
      parts.push(`Magic: ${magicDesc}`);
    }

    // Mundane items
    if (hoard.mundaneItems.length > 0) {
      const mundaneDesc = hoard.mundaneItems.map(item => 
        `${item.name} ($${item.value}, ${item.weight} lbs)`
      ).join('; ');
      parts.push(`Valuables: ${mundaneDesc}`);
    }

    parts.push(`Total: $${hoard.totalValue}, ${hoard.totalWeight.toFixed(2)} lbs`);

    return parts.join('\n');
  }
}

export default DFRPGTreasureGenerator;