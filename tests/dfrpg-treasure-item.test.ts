import { describe, expect, it } from 'vitest';
import { DFRPGTreasureItemGenerator } from '../src/systems/dfrpg/DFRPGTreasureItem';

function rngSeq(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++];
}

describe('DFRPGTreasureItemGenerator', () => {
  it('generates example flaming axe', () => {
    const seq = [
      0.1, // category melee
      0.4, // choose Axe
      0.1, // Balanced apply
      0.2, // Dwarven apply
      0.2, // Fine apply
      0.8, // Meteoric skip
      0.8, // Orichalcum skip
      0.8, // Silvered skip
      0.8, // Silver skip
      0.8, // Ornate+1 skip
      0.8, // Ornate+2 skip
      0.8, // Ornate+3 skip
      0.2, // magical yes
      0.3  // choose Flaming Weapon
    ];
    const g = new DFRPGTreasureItemGenerator(rngSeq(seq));
    const item = g.generate();
    expect(item.baseItem).toBe('Axe');
    expect(item.modifiers).toEqual([
      'Balanced (+4 CF)',
      'Dwarven (+4 CF)',
      'Fine (+9 CF)'
    ]);
    expect(item.enchantments[0].name).toBe('Flaming Weapon');
    expect(item.finalCost).toBe(16300);
    expect(item.name).toBe('A Balanced, Dwarven, Fine Flaming Axe of Flame');
  });
});
