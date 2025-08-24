import { describe, it, expect } from 'vitest';
import { EncounterBalanceService } from '../src/systems/dfrpg/EncounterBalanceService';
import type { Room, Monster, Trap } from '../src/core/types';
import type { TreasureHoard } from '../src/systems/dfrpg/DFRPGTreasure';

describe('EncounterBalanceService', () => {
  const balanceService = new EncounterBalanceService(() => 0.5); // Fixed seed for deterministic tests

  const mockRoom: Room = {
    id: 'test-room',
    kind: 'chamber',
    x: 5,
    y: 5,
    w: 4,
    h: 3,
    shape: 'rectangular'
  };

  const lowCERMonster: Monster = {
    name: 'Goblin',
    cer: 15,
    threat_rating: 'fodder'
  };

  const mediumCERMonster: Monster = {
    name: 'Orc Warrior',
    cer: 75,
    threat_rating: 'worthy'
  };

  const bossMonster: Monster = {
    name: 'Dragon',
    cer: 150,
    threat_rating: 'boss'
  };

  const basicTrap: Trap = {
    name: 'Pit Trap',
    level: 2
  };

  const dangerousTrap: Trap = {
    name: 'Poison Gas',
    level: 4
  };

  describe('assessEncounterRisk', () => {
    it('should assess trivial risk for empty encounter', () => {
      const risk = balanceService.assessEncounterRisk([], [], mockRoom);
      
      expect(risk.monsterTotalCER).toBe(0);
      expect(risk.monsterCount).toBe(0);
      expect(risk.hasLeaderMonster).toBe(false);
      expect(risk.trapDanger).toBe(0);
      expect(risk.trapCount).toBe(0);
      expect(risk.roomType).toBe('normal');
      expect(risk.riskRating).toBe('trivial');
    });

    it('should assess low risk for single weak monster', () => {
      const risk = balanceService.assessEncounterRisk([lowCERMonster], [], mockRoom);
      
      expect(risk.monsterTotalCER).toBe(15);
      expect(risk.monsterCount).toBe(1);
      expect(risk.hasLeaderMonster).toBe(false);
      expect(risk.riskRating).toBe('low');
    });

    it('should assess high risk for boss monster', () => {
      const risk = balanceService.assessEncounterRisk([bossMonster], [], mockRoom);
      
      expect(risk.monsterTotalCER).toBe(150);
      expect(risk.monsterCount).toBe(1);
      expect(risk.hasLeaderMonster).toBe(true);
      expect(risk.roomType).toBe('boss'); // Should upgrade room type for boss monster
      expect(risk.riskRating).toBe('extreme');
    });

    it('should assess increased risk for multiple monsters', () => {
      const multipleMonsters = [lowCERMonster, lowCERMonster, mediumCERMonster];
      const risk = balanceService.assessEncounterRisk(multipleMonsters, [], mockRoom);
      
      expect(risk.monsterTotalCER).toBe(105); // 15 + 15 + 75
      expect(risk.monsterCount).toBe(3);
      expect(risk.riskRating).toBe('extreme'); // High CER + multiple monsters = extreme
    });

    it('should assess trap danger correctly', () => {
      const risk = balanceService.assessEncounterRisk([], [basicTrap, dangerousTrap], mockRoom);
      
      expect(risk.trapDanger).toBe(15); // 2*2.5 + 4*2.5 = 5 + 10
      expect(risk.trapCount).toBe(2);
      expect(risk.riskRating).toBe('moderate');
    });

    it('should recognize boss rooms by kind', () => {
      const bossRoom: Room = { ...mockRoom, kind: 'lair' };
      const risk = balanceService.assessEncounterRisk([], [], bossRoom);
      
      expect(risk.roomType).toBe('boss');
    });

    it('should recognize special rooms by kind', () => {
      const specialRoom: Room = { ...mockRoom, kind: 'special' };
      const risk = balanceService.assessEncounterRisk([], [], specialRoom);
      
      expect(risk.roomType).toBe('special');
    });
  });

  describe('calculateTargetTreasureValue', () => {
    it('should return base value for trivial encounters', () => {
      const risk = balanceService.assessEncounterRisk([], [], mockRoom);
      const targetValue = balanceService.calculateTargetTreasureValue(risk, 1);
      
      expect(targetValue).toBeGreaterThan(0);
      expect(targetValue).toBeLessThan(200); // Should be around base value for level 1
    });

    it('should increase value for high-risk encounters', () => {
      const bossRisk = balanceService.assessEncounterRisk([bossMonster], [dangerousTrap], mockRoom);
      const targetValue = balanceService.calculateTargetTreasureValue(bossRisk, 1);
      
      expect(targetValue).toBeGreaterThan(1000); // Should be much higher than base
    });

    it('should respect minimum boss room value', () => {
      const bossRoom: Room = { ...mockRoom, kind: 'lair' };
      const bossRisk = balanceService.assessEncounterRisk([lowCERMonster], [], bossRoom);
      const targetValue = balanceService.calculateTargetTreasureValue(bossRisk, 1, {
        minimumBossRoomValue: 2000
      });
      
      expect(targetValue).toBeGreaterThanOrEqual(2000);
    });

    it('should adjust for wealth levels', () => {
      const risk = balanceService.assessEncounterRisk([mediumCERMonster], [], mockRoom);
      
      const conservativeValue = balanceService.calculateTargetTreasureValue(risk, 2, {
        targetWealthLevel: 'conservative'
      });
      
      const standardValue = balanceService.calculateTargetTreasureValue(risk, 2, {
        targetWealthLevel: 'standard'
      });
      
      const generousValue = balanceService.calculateTargetTreasureValue(risk, 2, {
        targetWealthLevel: 'generous'
      });
      
      expect(conservativeValue).toBeLessThan(standardValue);
      expect(standardValue).toBeLessThan(generousValue);
    });

    it('should increase value for special rooms', () => {
      const normalRisk = balanceService.assessEncounterRisk([mediumCERMonster], [], mockRoom);
      const specialRoom: Room = { ...mockRoom, kind: 'special' };
      const specialRisk = balanceService.assessEncounterRisk([mediumCERMonster], [], specialRoom);
      
      const normalValue = balanceService.calculateTargetTreasureValue(normalRisk, 2);
      const specialValue = balanceService.calculateTargetTreasureValue(specialRisk, 2);
      
      expect(specialValue).toBeGreaterThan(normalValue);
    });
  });

  describe('adjustTreasureForRisk', () => {
    const baseTreasureHoard: TreasureHoard = {
      coins: {
        copper: 100,
        silver: 50,
        gold: 10,
        totalValue: 160,
        totalWeight: 3.2
      },
      magicItems: [],
      mundaneItems: [
        {
          name: 'Silver Goblet',
          category: 'art',
          value: 50,
          weight: 1
        }
      ],
      totalValue: 210,
      totalWeight: 4.2
    };

    it('should maintain hoard when close to target', () => {
      const risk = balanceService.assessEncounterRisk([lowCERMonster], [], mockRoom);
      const adjusted = balanceService.adjustTreasureForRisk(baseTreasureHoard, 200, risk);
      
      // Should be very close to original since target is close
      expect(Math.abs(adjusted.totalValue - baseTreasureHoard.totalValue)).toBeLessThan(100);
    });

    it('should increase treasure value for high target', () => {
      const risk = balanceService.assessEncounterRisk([bossMonster], [], mockRoom);
      const adjusted = balanceService.adjustTreasureForRisk(baseTreasureHoard, 1500, risk);
      
      expect(adjusted.totalValue).toBeGreaterThan(baseTreasureHoard.totalValue);
      expect(adjusted.totalValue).toBeGreaterThan(1000); // Should be close to target
    });

    it('should add guaranteed magic items to boss rooms', () => {
      const bossRoom: Room = { ...mockRoom, kind: 'lair' };
      const bossRisk = balanceService.assessEncounterRisk([bossMonster], [], bossRoom);
      const adjusted = balanceService.adjustTreasureForRisk(baseTreasureHoard, 1000, bossRisk, {
        guaranteedBossRoomMagicItems: true
      });
      
      expect(adjusted.magicItems.length).toBeGreaterThan(0);
      expect(adjusted.magicItems[0].name).toBeDefined();
      expect(adjusted.magicItems[0].value).toBeGreaterThan(0);
    });

    it('should scale coin amounts proportionally', () => {
      const risk = balanceService.assessEncounterRisk([mediumCERMonster], [], mockRoom);
      const adjusted = balanceService.adjustTreasureForRisk(baseTreasureHoard, 500, risk);
      
      const scaleFactor = 500 / baseTreasureHoard.totalValue;
      const expectedGold = Math.round(baseTreasureHoard.coins.gold * scaleFactor);
      
      expect(adjusted.coins.gold).toBeCloseTo(expectedGold, 0);
    });

    it('should recalculate totals correctly', () => {
      const risk = balanceService.assessEncounterRisk([bossMonster], [], mockRoom);
      const adjusted = balanceService.adjustTreasureForRisk(baseTreasureHoard, 1200, risk);
      
      const calculatedValue = adjusted.coins.totalValue + 
        adjusted.magicItems.reduce((sum, item) => sum + item.value, 0) +
        adjusted.mundaneItems.reduce((sum, item) => sum + item.value, 0);
      
      expect(adjusted.totalValue).toBe(calculatedValue);
    });
  });

  describe('edge cases and validation', () => {
    it('should handle undefined monster CER values', () => {
      const monsterWithoutCER: Monster = { name: 'Unknown Beast' };
      const risk = balanceService.assessEncounterRisk([monsterWithoutCER], [], mockRoom);
      
      expect(risk.monsterTotalCER).toBe(0);
      expect(risk.riskRating).toBe('trivial');
    });

    it('should handle undefined trap levels', () => {
      const trapWithoutLevel: Trap = { name: 'Mystery Trap' };
      const risk = balanceService.assessEncounterRisk([], [trapWithoutLevel], mockRoom);
      
      expect(risk.trapDanger).toBe(2.5); // Should use default level 1
    });

    it('should handle very high-level dungeons', () => {
      const risk = balanceService.assessEncounterRisk([bossMonster], [], mockRoom);
      const targetValue = balanceService.calculateTargetTreasureValue(risk, 15); // High level
      
      expect(targetValue).toBeGreaterThan(1000);
      expect(targetValue).toBeLessThan(50000); // Should be reasonable
    });

    it('should handle empty treasure hoard', () => {
      const emptyHoard: TreasureHoard = {
        coins: { copper: 0, silver: 0, gold: 0, totalValue: 0, totalWeight: 0 },
        magicItems: [],
        mundaneItems: [],
        totalValue: 0,
        totalWeight: 0
      };
      
      const risk = balanceService.assessEncounterRisk([mediumCERMonster], [], mockRoom);
      const adjusted = balanceService.adjustTreasureForRisk(emptyHoard, 500, risk);
      
      expect(adjusted.totalValue).toBeGreaterThan(0);
    });
  });
});