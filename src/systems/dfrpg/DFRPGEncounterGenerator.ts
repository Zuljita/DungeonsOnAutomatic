import DFRPGMonsterGenerator, { MonsterGenerationConfig } from './DFRPGMonsterGenerator.js';
import DFRPGTreasureGenerator, { TreasureHoard } from './DFRPGTreasure.js';
import type { DFRPGMonster } from './data/monsters.js';

export interface Encounter {
  monsters: DFRPGMonster[];
  treasure: TreasureHoard;
}

export class DFRPGEncounterGenerator {
  private monsterGen: DFRPGMonsterGenerator;
  private treasureGen: DFRPGTreasureGenerator;

  constructor(rng: () => number = Math.random) {
    this.monsterGen = new DFRPGMonsterGenerator(rng);
    this.treasureGen = new DFRPGTreasureGenerator(rng);
  }

  generate(config: MonsterGenerationConfig): Encounter {
    const monsters = this.monsterGen.generate(config);
    const treasure = this.treasureGen.generate(config);
    return { monsters, treasure };
  }
}

export default DFRPGEncounterGenerator;
