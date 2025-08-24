import type { Room, Monster, Trap } from '../../core/types';
import type { TreasureHoard } from './DFRPGTreasure';

export interface EncounterRisk {
  /** Total CER of all monsters in encounter */
  monsterTotalCER: number;
  /** Number of monsters in encounter */
  monsterCount: number;
  /** Whether encounter has a leader/boss monster */
  hasLeaderMonster: boolean;
  /** Combined trap danger level (0-10 scale) */
  trapDanger: number;
  /** Number of traps in encounter */
  trapCount: number;
  /** Type of room for special bonuses */
  roomType: 'normal' | 'special' | 'boss';
  /** Overall risk rating for the encounter */
  riskRating: 'trivial' | 'low' | 'moderate' | 'high' | 'extreme';
}

export interface BalancedTreasureOptions {
  /** Enable encounter-based treasure balancing */
  useEncounterBalancing?: boolean;
  /** Target wealth level for campaign */
  targetWealthLevel?: 'conservative' | 'standard' | 'generous';
  /** Multiplier for special rooms */
  specialRoomMultiplier?: number;
  /** Minimum treasure value for boss rooms */
  minimumBossRoomValue?: number;
  /** Guarantee at least one magic item in boss rooms */
  guaranteedBossRoomMagicItems?: boolean;
}

/**
 * Service for balancing treasure rewards based on encounter difficulty
 */
export class EncounterBalanceService {
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  /**
   * Assess the risk level of an encounter
   */
  assessEncounterRisk(
    monsters: Monster[] = [],
    traps: Trap[] = [],
    room: Room
  ): EncounterRisk {
    // Calculate monster threat
    const monsterTotalCER = monsters.reduce((total, monster) => {
      return total + (monster.cer || 0);
    }, 0);

    const monsterCount = monsters.length;
    
    // Determine if there's a leader monster (boss-level threat)
    const hasLeaderMonster = monsters.some(monster => {
      const cer = monster.cer || 0;
      return cer >= 100 || monster.threat_rating === 'boss';
    });

    // Calculate trap danger (estimate based on trap levels)
    const trapDanger = traps.reduce((total, trap) => {
      // Estimate danger from trap level (1-4 becomes 0-10 scale)
      const level = trap.level || 1;
      return total + Math.min(level * 2.5, 10);
    }, 0);

    const trapCount = traps.length;

    // Determine room type from room kind and special characteristics
    let roomType: 'normal' | 'special' | 'boss' = 'normal';
    
    if (room.kind === 'lair') {
      roomType = 'boss';
    } else if (['special', 'exit to upper level', 'entrance to lower level', 'dungeon entrance'].includes(room.kind)) {
      roomType = 'special';
    }

    // If there's a boss monster, upgrade room type
    if (hasLeaderMonster && roomType === 'normal') {
      roomType = 'boss';
    }

    // Calculate overall risk rating
    let totalRiskScore = 0;
    
    // Monster risk (CER-based)
    if (monsterTotalCER <= 10) totalRiskScore += 1;
    else if (monsterTotalCER <= 25) totalRiskScore += 2;
    else if (monsterTotalCER <= 50) totalRiskScore += 3;
    else if (monsterTotalCER <= 100) totalRiskScore += 4;
    else totalRiskScore += 6; // Boss-level monsters get higher score

    // Trap risk
    if (trapDanger > 0) {
      if (trapDanger <= 2) totalRiskScore += 1;
      else if (trapDanger <= 5) totalRiskScore += 2;
      else if (trapDanger <= 8) totalRiskScore += 3;
      else totalRiskScore += 4;
    }

    // Room type bonus risk
    if (roomType === 'special') totalRiskScore += 1;
    else if (roomType === 'boss') totalRiskScore += 2;

    // Multiple monster bonus (coordination makes it harder)
    if (monsterCount > 1) totalRiskScore += Math.min(monsterCount - 1, 3);

    // Determine risk rating
    let riskRating: EncounterRisk['riskRating'] = 'trivial';
    if (totalRiskScore >= 8) riskRating = 'extreme';
    else if (totalRiskScore >= 6) riskRating = 'high';
    else if (totalRiskScore >= 4) riskRating = 'moderate';
    else if (totalRiskScore >= 2) riskRating = 'low';

    return {
      monsterTotalCER,
      monsterCount,
      hasLeaderMonster,
      trapDanger,
      trapCount,
      roomType,
      riskRating
    };
  }

  /**
   * Calculate target treasure value based on encounter risk
   */
  calculateTargetTreasureValue(
    risk: EncounterRisk,
    baseLevel: number,
    options: BalancedTreasureOptions = {}
  ): number {
    const {
      targetWealthLevel = 'standard',
      specialRoomMultiplier = 1.5,
      minimumBossRoomValue = 1000
    } = options;

    // Base treasure value for the dungeon level
    const baseTreasure = this.getBaseValueForLevel(baseLevel, targetWealthLevel);
    
    // Monster threat multiplier (1.0 - 3.0)
    let monsterMultiplier = 1.0;
    if (risk.monsterTotalCER > 0) {
      monsterMultiplier = 1.0 + Math.min(risk.monsterTotalCER / 50, 2.0);
    }
    
    // Special room bonus
    let roomBonus = 1.0;
    if (risk.roomType === 'special') {
      roomBonus = specialRoomMultiplier;
    } else if (risk.roomType === 'boss') {
      roomBonus = Math.max(specialRoomMultiplier * 1.5, 2.0);
    }
    
    // Trap danger bonus (up to +50%)
    const trapBonus = 1.0 + Math.min(risk.trapDanger / 20, 0.5);
    
    // Multiple monster coordination bonus
    const coordinationBonus = risk.monsterCount > 1 
      ? 1.0 + ((risk.monsterCount - 1) * 0.15)
      : 1.0;

    let targetValue = baseTreasure * monsterMultiplier * roomBonus * trapBonus * coordinationBonus;

    // Ensure boss rooms meet minimum value
    if (risk.roomType === 'boss') {
      targetValue = Math.max(targetValue, minimumBossRoomValue);
    }

    // Add some randomization (±25%)
    const randomFactor = 0.75 + (this.rng() * 0.5);
    targetValue *= randomFactor;

    return Math.round(targetValue);
  }

  /**
   * Adjust treasure hoard generation to target a specific value
   */
  adjustTreasureForRisk(
    originalHoard: TreasureHoard,
    targetValue: number,
    risk: EncounterRisk,
    options: BalancedTreasureOptions = {}
  ): TreasureHoard {
    const { guaranteedBossRoomMagicItems = true } = options;

    // If original hoard is already close to target (within 25%), return as-is
    const tolerance = targetValue * 0.25;
    if (Math.abs(originalHoard.totalValue - targetValue) <= tolerance && 
        (!risk.roomType || risk.roomType === 'normal')) {
      return originalHoard;
    }

    // Handle empty hoard specially
    let adjustedCoins;
    if (originalHoard.totalValue === 0) {
      // Create coins from scratch to reach target value
      const coinValue = Math.round(targetValue * 0.6); // 60% of target in coins
      const goldCoins = Math.floor(coinValue / 5); // Assuming 1 gold = $5
      adjustedCoins = {
        copper: 0,
        silver: 0,
        gold: goldCoins,
        totalValue: coinValue,
        totalWeight: goldCoins * 0.01 // Assuming 1 gold coin = 0.01 lbs
      };
    } else {
      // Adjust existing coins proportionally
      const adjustmentRatio = targetValue / originalHoard.totalValue;
      adjustedCoins = {
        ...originalHoard.coins,
        copper: Math.round(originalHoard.coins.copper * adjustmentRatio),
        silver: Math.round(originalHoard.coins.silver * adjustmentRatio),
        gold: Math.round(originalHoard.coins.gold * adjustmentRatio),
        totalValue: Math.round(originalHoard.coins.totalValue * adjustmentRatio),
        totalWeight: originalHoard.coins.totalWeight * adjustmentRatio
      };
    }

    // For significant adjustments or special rooms, modify magic items
    const adjustedMagicItems = [...originalHoard.magicItems];
    
    // Boss rooms get guaranteed magic items
    if (risk.roomType === 'boss' && guaranteedBossRoomMagicItems && adjustedMagicItems.length === 0) {
      // Add a guaranteed magic item appropriate to the encounter
      adjustedMagicItems.push(this.generateGuaranteedMagicItem(risk, targetValue));
    }

    // If we need to increase value significantly, add more valuable items
    const adjustmentRatio = originalHoard.totalValue > 0 ? targetValue / originalHoard.totalValue : 1;
    if (adjustmentRatio > 1.5 || originalHoard.totalValue === 0) {
      const extraValue = targetValue - originalHoard.totalValue;
      if (extraValue > 500 && this.rng() < 0.7) {
        // Add an extra magic item for high-value encounters
        adjustedMagicItems.push(this.generateGuaranteedMagicItem(risk, extraValue));
      }
    }

    // Adjust mundane items proportionally (or leave empty for empty hoard)
    const adjustedMundaneItems = originalHoard.mundaneItems.map(item => ({
      ...item,
      value: Math.round(item.value * adjustmentRatio)
    }));

    // Recalculate totals
    const magicItemsValue = adjustedMagicItems.reduce((sum, item) => sum + item.value, 0);
    const mundaneItemsValue = adjustedMundaneItems.reduce((sum, item) => sum + item.value, 0);
    const totalValue = adjustedCoins.totalValue + magicItemsValue + mundaneItemsValue;
    
    const magicItemsWeight = adjustedMagicItems.reduce((sum, item) => sum + item.weight, 0);
    const mundaneItemsWeight = adjustedMundaneItems.reduce((sum, item) => sum + item.weight, 0);
    const totalWeight = adjustedCoins.totalWeight + magicItemsWeight + mundaneItemsWeight;

    return {
      coins: adjustedCoins,
      magicItems: adjustedMagicItems,
      mundaneItems: adjustedMundaneItems,
      totalValue,
      totalWeight
    };
  }

  /**
   * Get base treasure value for a dungeon level
   */
  private getBaseValueForLevel(level: number, wealthLevel: 'conservative' | 'standard' | 'generous'): number {
    // Base values per level for standard wealth
    const baseValues = [100, 200, 350, 500, 700, 950, 1250, 1600, 2000, 2500];
    const standardValue = baseValues[Math.min(level - 1, baseValues.length - 1)] || 100;

    // Adjust for wealth level
    switch (wealthLevel) {
      case 'conservative':
        return Math.round(standardValue * 0.75);
      case 'generous':
        return Math.round(standardValue * 1.4);
      default:
        return standardValue;
    }
  }

  /**
   * Generate a guaranteed magic item for special encounters
   */
  private generateGuaranteedMagicItem(risk: EncounterRisk, targetValue: number): any {
    // Simple implementation - in a real system this would use the full magic item tables
    const powerLevel = targetValue > 2000 ? 'major' : targetValue > 500 ? 'minor' : 'minor';
    const baseValue = powerLevel === 'major' ? 1200 : 400;
    
    const items = [
      { name: 'Sword of Sharpness', category: 'weapon', value: baseValue * 1.5, weight: 3 },
      { name: 'Shield of Blocking', category: 'armor', value: baseValue, weight: 15 },
      { name: 'Potion of Healing', category: 'potion', value: baseValue * 0.5, weight: 0.5 },
      { name: 'Ring of Protection', category: 'accessory', value: baseValue * 1.2, weight: 0.1 },
      { name: 'Power Stone', category: 'power_item', value: baseValue * 0.8, weight: 0.1 }
    ];

    const selectedItem = items[Math.floor(this.rng() * items.length)];
    
    return {
      ...selectedItem,
      powerLevel,
      quirks: risk.roomType === 'boss' ? ['Ornate craftsmanship', 'Faintly magical aura'] : ['Well-crafted']
    };
  }
}