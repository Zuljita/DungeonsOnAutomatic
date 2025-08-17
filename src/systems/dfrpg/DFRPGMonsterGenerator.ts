import { MONSTERS, DFRPGMonster } from './data/monsters.js';

export interface MonsterGenerationConfig {
  characterPoints: number;
  biome?: string;
  includeTags?: string[];
  excludeTags?: string[];
}

export class DFRPGMonsterGenerator {
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  generate(config: MonsterGenerationConfig): DFRPGMonster[] {
    const { characterPoints, biome, includeTags = [], excludeTags = [] } = config;

    let pool = MONSTERS;

    if (biome) {
      const b = biome.toLowerCase();
      pool = pool.filter(m => m.biome.includes(b));
    }

    if (includeTags.length) {
      const inc = includeTags.map(t => t.toLowerCase());
      pool = pool.filter(m => inc.every(t => m.tags.includes(t)));
    }

    if (excludeTags.length) {
      const exc = excludeTags.map(t => t.toLowerCase());
      pool = pool.filter(m => !exc.some(t => m.tags.includes(t)));
    }

    pool = pool.filter(m => m.points <= characterPoints);

    if (pool.length === 0) {
      return [];
    }

    const sorted = [...pool].sort((a, b) => b.points - a.points);
    const leaderOptions = sorted.filter(m => m.points <= characterPoints);
    const leader = leaderOptions[Math.floor(this.rng() * leaderOptions.length)];

    const encounter: DFRPGMonster[] = [leader];
    let remaining = characterPoints - leader.points;

    while (remaining > 0) {
      const candidates = sorted.filter(m => m.points <= remaining);
      if (candidates.length === 0) break;
      const next = candidates[Math.floor(this.rng() * candidates.length)];
      encounter.push(next);
      remaining -= next.points;
      if (next.points === 0) break;
    }

    return encounter;
  }
}

export default DFRPGMonsterGenerator;
