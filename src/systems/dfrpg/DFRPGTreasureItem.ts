export interface TreasureItem {
  name: string;
  baseItem: string;
  finalCost: number;
  finalWeight: number;
  modifiers: string[];
  enchantments: { name: string; effect: string; cost: number }[];
}

interface BaseItem {
  name: string;
  cost: number;
  weight: number;
  type: 'melee' | 'ranged' | 'armor' | 'shield' | 'gear';
  tags?: string[];
}

interface Modifier {
  name: string;
  cf: number | ((item: BaseItem) => number);
  eligible: (item: BaseItem) => boolean;
  group?: string; // for mutual exclusivity
  apply?: (item: { weight: number }) => void;
}

interface Enchantment {
  name: string;
  for: 'melee' | 'ranged' | 'armor' | 'shield' | 'gear';
  prefix: string;
  suffix: string;
  effect: string;
  cost: number;
  weightMultiplier?: number;
}

const BASE_ITEMS: BaseItem[] = [
  // Melee weapons
  { name: 'Broadsword', cost: 500, weight: 3, type: 'melee', tags: ['sword', 'metal weapon'] },
  { name: 'Axe', cost: 50, weight: 4, type: 'melee', tags: ['cutting', 'unbalanced', 'metal weapon'] },
  { name: 'Spear', cost: 40, weight: 3, type: 'melee', tags: ['impaling', 'metal weapon'] },
  // Ranged weapons
  { name: 'Bow', cost: 100, weight: 2, type: 'ranged', tags: ['bow'] },
  { name: 'Crossbow', cost: 150, weight: 4, type: 'ranged', tags: ['crossbow', 'metal weapon'] },
  { name: 'Sling', cost: 20, weight: 1, type: 'ranged', tags: ['projectile'] },
  // Armor
  { name: 'Mail Armor', cost: 1500, weight: 40, type: 'armor', tags: ['mail', 'metal armor'] },
  { name: 'Plate Armor', cost: 5000, weight: 60, type: 'armor', tags: ['plate', 'metal armor'] },
  { name: 'Leather Armor', cost: 300, weight: 15, type: 'armor', tags: ['leather'] },
  // Shields
  { name: 'Small Shield', cost: 40, weight: 8, type: 'shield' },
  { name: 'Large Shield', cost: 60, weight: 15, type: 'shield' },
  // Misc gear
  { name: 'Rope (50 ft)', cost: 50, weight: 10, type: 'gear' },
  { name: 'Lantern', cost: 20, weight: 2, type: 'gear' },
  { name: 'Backpack', cost: 60, weight: 3, type: 'gear' }
];

const MODIFIERS: Modifier[] = [
  {
    name: 'Balanced',
    cf: 4,
    eligible: (i) => i.type === 'melee' && !i.tags?.includes('fist load') && i.name !== 'Stick'
  },
  {
    name: "Climber's",
    cf: 4,
    eligible: (i) => ['Hatchet', 'Pick', 'Jutte', 'Sai', 'Sickle', 'Tonfa'].includes(i.name)
  },
  {
    name: 'Dwarven',
    cf: 4,
    eligible: (i) => i.type === 'melee' && !!i.tags?.includes('unbalanced')
  },
  {
    name: 'Elven',
    cf: 16,
    eligible: (i) => !!i.tags?.includes('bow')
  },
  {
    name: 'Fine',
    cf: (i) => {
      if (i.type === 'ranged' && (i.tags?.includes('projectile') || i.tags?.includes('impaling') || i.tags?.includes('crushing'))) return 2;
      if (i.type === 'ranged' || i.tags?.includes('sword') || i.tags?.includes('fencing')) return 3;
      if (i.tags?.includes('cutting')) return 9;
      return 2;
    },
    eligible: (i) => i.type === 'melee' || i.type === 'ranged',
    group: 'fineness'
  },
  {
    name: 'Very Fine',
    cf: 19,
    eligible: (i) =>
      i.type === 'melee' && !!(i.tags?.includes('fencing') || i.tags?.includes('sword')),
    group: 'fineness'
  },
  {
    name: 'Meteoric',
    cf: 19,
    eligible: (i) => !!i.tags?.includes('metal weapon'),
    group: 'material'
  },
  {
    name: 'Orichalcum',
    cf: 29,
    eligible: (i) => !!i.tags?.includes('metal weapon'),
    group: 'material'
  },
  {
    name: 'Silvered',
    cf: 2,
    eligible: (i) => !!i.tags?.includes('metal weapon'),
    group: 'material'
  },
  {
    name: 'Silver',
    cf: 19,
    eligible: (i) => !!i.tags?.includes('metal weapon'),
    group: 'material'
  },
  {
    name: 'Ornate +1',
    cf: 1,
    eligible: () => true
  },
  {
    name: 'Ornate +2',
    cf: 2,
    eligible: () => true
  },
  {
    name: 'Ornate +3',
    cf: 3,
    eligible: () => true
  },
  {
    name: 'Spiked',
    cf: 2,
    eligible: (i) => i.type === 'armor' && !!i.tags?.includes('plate')
  },
  {
    name: "Thieves'",
    cf: 3,
    eligible: (i) => i.type === 'armor' && !!i.tags?.includes('mail')
  }
];

const ENCHANTMENTS: Enchantment[] = [
  { name: 'Flaming Weapon', for: 'melee', prefix: 'Flaming', suffix: 'of Flame', effect: '+2 fire damage', cost: 15400 },
  { name: 'Puissance +1', for: 'melee', prefix: 'Mighty', suffix: 'of Smiting', effect: '+1 damage', cost: 15000 },
  { name: 'Accuracy +1', for: 'ranged', prefix: 'Accurate', suffix: 'of True Aim', effect: '+1 to hit', cost: 10000 },
  { name: 'Fortify +1', for: 'armor', prefix: 'Fortified', suffix: '', effect: '+1 DR', cost: 5000 },
  { name: 'Lighten', for: 'armor', prefix: 'Lightened', suffix: '', effect: 'Half weight', cost: 2000, weightMultiplier: 0.5 },
  { name: 'Deflect +1', for: 'shield', prefix: '', suffix: 'of Deflection', effect: '+1 DB', cost: 7000 }
];

export class DFRPGTreasureItemGenerator {
  constructor(private rng: () => number = Math.random) {}

  generate(): TreasureItem {
    const categories: BaseItem['type'][] = ['melee', 'ranged', 'armor', 'shield', 'gear'];
    const categoryIndex = Math.floor(this.rng() * categories.length);
    const category = categories[categoryIndex];

    const candidates = BASE_ITEMS.filter((i) => i.type === category);
    const base = { ...candidates[Math.floor(this.rng() * candidates.length)] };

    let totalCF = 0;
    const applied: string[] = [];
    const usedGroups: Record<string, boolean> = {};

    for (const mod of MODIFIERS) {
      if (!mod.eligible(base)) continue;
      if (mod.group && usedGroups[mod.group]) continue;
      if (this.rng() < 0.5) {
        const cf = typeof mod.cf === 'function' ? mod.cf(base) : mod.cf;
        totalCF += cf;
        applied.push(`${mod.name} (+${cf} CF)`);
        if (mod.group) usedGroups[mod.group] = true;
        mod.apply?.(base);
      }
    }

    const costBefore = base.cost * (1 + totalCF);
    let weight = base.weight;

    // Apply enchantment
    const enchantments: { name: string; effect: string; cost: number }[] = [];
    let finalCost = costBefore;
    let prefix = '';
    let suffix = '';
    if (this.rng() < 0.5) {
      const available = ENCHANTMENTS.filter((e) => e.for === base.type);
      if (available.length > 0) {
        const ench = available[Math.floor(this.rng() * available.length)];
        finalCost += ench.cost;
        weight *= ench.weightMultiplier ?? 1;
        enchantments.push({ name: ench.name, effect: ench.effect, cost: ench.cost });
        prefix = ench.prefix;
        suffix = ench.suffix;
      }
    }

    const nameParts = [] as string[];
    if (applied.length) {
      nameParts.push(applied.map((m) => m.split(' (+')[0]).join(', '));
    }
    if (prefix) nameParts.push(prefix);
    nameParts.push(base.name);
    if (suffix) nameParts.push(suffix);
    const name = `A ${nameParts.join(' ')}`;

    return {
      name,
      baseItem: base.name,
      finalCost: Math.round(finalCost),
      finalWeight: Math.round(weight * 100) / 100,
      modifiers: applied,
      enchantments
    };
  }
}
