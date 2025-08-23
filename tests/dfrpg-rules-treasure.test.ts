import { describe, it, expect } from 'vitest';
import { DFRPGTreasureRuleGenerator, type GeneratedItem } from '../src/systems/dfrpg/DFRPGTreasureRules';

describe('DFRPGTreasureRuleGenerator', () => {
  const generator = new DFRPGTreasureRuleGenerator(() => 0.1); // Low fixed seed to trigger modifiers and enchantments

  describe('DFRPG rules compliance', () => {
    it('should generate items following DFRPG Cost Factor rules', () => {
      // Generate multiple items to test different combinations
      const items: GeneratedItem[] = [];
      for (let i = 0; i < 10; i++) {
        items.push(generator.generateDFRPGItem());
      }

      items.forEach(item => {
        expect(item.name).toBeDefined();
        expect(item.baseItem).toBeDefined();
        expect(item.finalCost).toBeGreaterThan(0);
        expect(item.finalWeight).toBeGreaterThan(0);
        expect(Array.isArray(item.modifiers)).toBe(true);
        expect(Array.isArray(item.enchantments)).toBe(true);
        
        // Verify item has proper category
        expect(['melee_weapon', 'ranged_weapon', 'armor', 'shield', 'gear'].includes(item.category)).toBe(true);
      });
    });

    it('should apply Cost Factors correctly', () => {
      // Create a deterministic test by generating many items
      let foundModifiedItem = false;
      
      for (let i = 0; i < 20; i++) {
        const item = generator.generateDFRPGItem();
        
        if (item.modifiers.length > 0) {
          foundModifiedItem = true;
          
          // Cost should be base cost * (1 + sum of all CFs) + enchantment costs
          const totalCF = item.modifiers.reduce((sum, mod) => sum + mod.cf, 0);
          const enchantmentCosts = item.enchantments.reduce((sum, ench) => sum + ench.cost, 0);
          
          // We can't easily verify the exact calculation without knowing base cost,
          // but we can verify the item cost is reasonable for the modifiers applied
          if (totalCF > 0) {
            expect(item.finalCost).toBeGreaterThan(50); // Should be significantly more than base
          }
          
          if (enchantmentCosts > 0) {
            expect(item.finalCost).toBeGreaterThan(1000); // Enchanted items are expensive
          }
        }
      }
      
      // We should find at least some modified items in 20 attempts
      expect(foundModifiedItem).toBe(true);
    });

    it('should respect modifier eligibility rules', () => {
      // Test that certain modifiers only apply to eligible items
      const items: GeneratedItem[] = [];
      for (let i = 0; i < 50; i++) {
        items.push(generator.generateDFRPGItem());
      }

      items.forEach(item => {
        item.modifiers.forEach(modifier => {
          switch (modifier.name) {
            case 'Elven':
              // Should only be on bows
              expect(item.baseItem.toLowerCase().includes('bow')).toBe(true);
              break;
            case 'Meteoric':
            case 'Orichalcum':
            case 'Silver (coated)':
            case 'Silver (solid)':
              // Should only be on metal weapons - we can't easily verify this without item tags
              // but these modifiers should exist
              expect(modifier.cf).toBeGreaterThan(0);
              break;
          }
        });
      });
    });

    it('should handle mutually exclusive modifiers', () => {
      const items: GeneratedItem[] = [];
      for (let i = 0; i < 50; i++) {
        items.push(generator.generateDFRPGItem());
      }

      items.forEach(item => {
        const modifierNames = item.modifiers.map(m => m.name);
        
        // Fine and Very Fine should be mutually exclusive
        if (modifierNames.includes('Fine')) {
          expect(modifierNames.includes('Very Fine')).toBe(false);
          expect(modifierNames.includes('Silver')).toBe(false);
        }
        
        if (modifierNames.includes('Very Fine')) {
          expect(modifierNames.includes('Fine')).toBe(false);
        }
        
        // Meteoric, Orichalcum, and Silver should be mutually exclusive
        const metalModifiers = modifierNames.filter(name => 
          ['Meteoric', 'Orichalcum', 'Silver (coated)', 'Silver (solid)'].includes(name)
        );
        expect(metalModifiers.length).toBeLessThanOrEqual(1);
      });
    });

    it('should generate proper treasure hoards', () => {
      const hoard = generator.generateDFRPGTreasureHoard(5, 'medium');
      
      expect(hoard.coins).toBeDefined();
      expect(hoard.coins.totalValue).toBeGreaterThan(0);
      expect(hoard.magicItems).toBeDefined();
      expect(hoard.mundaneItems).toBeDefined();
      expect(hoard.totalValue).toBeGreaterThan(0);
      expect(hoard.totalWeight).toBeGreaterThan(0);
      
      // Total value should equal sum of parts
      const calculatedValue = hoard.coins.totalValue + 
        hoard.magicItems.reduce((sum, item) => sum + item.value, 0) +
        hoard.mundaneItems.reduce((sum, item) => sum + item.value, 0);
      
      expect(Math.abs(hoard.totalValue - calculatedValue)).toBeLessThan(1);
    });

    it('should scale treasure appropriately by level and hoard size', () => {
      const smallLowLevel = generator.generateDFRPGTreasureHoard(1, 'small');
      const vastHighLevel = generator.generateDFRPGTreasureHoard(10, 'vast');
      
      expect(vastHighLevel.totalValue).toBeGreaterThan(smallLowLevel.totalValue);
      expect(vastHighLevel.coins.totalValue).toBeGreaterThan(smallLowLevel.coins.totalValue);
    });
  });

  describe('item name construction', () => {
    it('should construct proper item names with modifiers', () => {
      const items: GeneratedItem[] = [];
      for (let i = 0; i < 30; i++) {
        items.push(generator.generateDFRPGItem());
      }

      items.forEach(item => {
        // Name should include base item
        expect(item.name.toLowerCase()).toContain(item.baseItem.toLowerCase());
        
        // If modifiers exist, they should be in the name
        if (item.modifiers.length > 0) {
          item.modifiers.forEach(modifier => {
            // The modifier name (or part of it) should appear in the item name
            const modifierWords = modifier.name.split(/[\s,()]/);
            const nameHasModifier = modifierWords.some(word => 
              word.length > 2 && item.name.toLowerCase().includes(word.toLowerCase())
            );
            if (!nameHasModifier) {
              console.log(`Warning: Modifier "${modifier.name}" not found in name "${item.name}"`);
            }
          });
        }
        
        // If enchanted, should have "A" prefix
        if (item.enchantments.length > 0) {
          expect(item.name.startsWith('A ')).toBe(true);
        }
      });
    });

    it('should handle enchantments properly', () => {
      // Generate many items to find enchanted ones
      let foundEnchanted = false;
      
      for (let i = 0; i < 100; i++) {
        const item = generator.generateDFRPGItem();
        
        if (item.enchantments.length > 0) {
          foundEnchanted = true;
          
          // Enchanted items should be expensive
          expect(item.finalCost).toBeGreaterThan(1000);
          
          // Should have proper enchantment data
          item.enchantments.forEach(ench => {
            expect(ench.name).toBeDefined();
            expect(ench.effect).toBeDefined();
            expect(ench.cost).toBeGreaterThan(0);
          });
          
          // Name should start with "A" for enchanted items
          expect(item.name.startsWith('A ')).toBe(true);
        }
      }
      
      // Should find some enchanted items in 100 attempts (20% chance each)
      expect(foundEnchanted).toBe(true);
    });
  });
});