import { MONSTERS, DFRPGMonster } from './data/monsters.js';

export interface MonsterGenerationConfig {
  characterPoints: number;
  biome?: string;
  includeTags?: string[];
  excludeTags?: string[];
}

export class DFRPGMonsterGenerator {
  private rng: () => number;

  private static freqWeights: Record<DFRPGMonster['frequency'], number> = {
    very_rare: 1,
    rare: 2,
    uncommon: 3,
    common: 4,
    very_common: 5
  };

  private weightedChoice(options: DFRPGMonster[]): DFRPGMonster {
    const total = options.reduce(
      (sum, m) => sum + DFRPGMonsterGenerator.freqWeights[m.frequency],
      0
    );
    let r = this.rng() * total;
    for (const m of options) {
      r -= DFRPGMonsterGenerator.freqWeights[m.frequency];
      if (r < 0) return m;
    }
    return options[options.length - 1];
  }

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
    const leader = this.weightedChoice(leaderOptions);

    const encounter: DFRPGMonster[] = [leader];
    let remaining = characterPoints - leader.points;

    while (remaining > 0) {
      const candidates = sorted.filter(m => m.points <= remaining);
      if (candidates.length === 0) break;
      const next = this.weightedChoice(candidates);
      encounter.push(next);
      remaining -= next.points;
      if (next.points === 0) break;
    }

    return encounter;
  }
}

export default DFRPGMonsterGenerator;
