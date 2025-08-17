import rawMonsters, { type RawMonster } from './monsters-complete.js';

export interface DFRPGMonster {
  name: string;
  points: number;
  tags: string[];
  biome: string[];
  frequency: 'very_rare' | 'rare' | 'uncommon' | 'common' | 'very_common';
  raw?: unknown;
}

export const MONSTERS: DFRPGMonster[] = (rawMonsters as RawMonster[]).map((m) => {
  const tags: string[] = [];
  if (typeof m.Class === 'string' && m.Class.trim()) {
    tags.push(m.Class.toLowerCase());
  }
  if (typeof m.Subclass === 'string' && m.Subclass.trim()) {
    tags.push(m.Subclass.toLowerCase());
  }
  const biome = typeof m.Environment === 'string' && m.Environment.trim()
    ? m.Environment.split(/,\s*/).map((b: string) => b.toLowerCase())
    : [];
  const points = typeof m.CER === 'number' ? m.CER : 0;
  const frequency: DFRPGMonster['frequency'] =
    points >= 100
      ? 'very_rare'
      : points >= 75
        ? 'rare'
        : points >= 50
          ? 'uncommon'
          : points >= 25
            ? 'common'
            : 'very_common';
  return {
    name: m.Description,
    points,
    tags,
    biome,
    frequency,
    raw: m
  };
});

export default MONSTERS;
