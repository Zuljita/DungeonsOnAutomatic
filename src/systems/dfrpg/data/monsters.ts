import rawMonsters, { type RawMonster } from './monsters-complete.js';

export interface DFRPGMonster {
  name: string;
  points: number;
  tags: string[];
  biome: string[];
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
  return {
    name: m.Description,
    points: typeof m.CER === 'number' ? m.CER : 0,
    tags,
    biome,
    raw: m
  };
});

export default MONSTERS;
