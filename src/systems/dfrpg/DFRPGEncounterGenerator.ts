import { DFRPGMonsterGenerator, type GenerateOptions, type GeneratedEncounter } from './DFRPGMonsterGenerator';
import DFRPGTreasureGenerator, { TreasureHoard } from './DFRPGTreasure.js';
import type { Monster } from '../../core/types';

export interface Encounter {
  monsters: Monster[];
  treasure: TreasureHoard;
  totalCER: number;
  actualThreatLevel: string;
  encounterType: 'single' | 'group' | 'mixed';
}

export class DFRPGEncounterGenerator {
  private monsterGen: DFRPGMonsterGenerator;
  private treasureGen: DFRPGTreasureGenerator;

  constructor(rng: () => number = Math.random) {
    this.monsterGen = new DFRPGMonsterGenerator(rng);
    this.treasureGen = new DFRPGTreasureGenerator(rng);
  }

  generate(config: GenerateOptions): Encounter {
    const encounter = this.monsterGen.generate(config);
    const treasure = this.treasureGen.generate(config);
    return { 
      monsters: encounter.monsters,
      treasure,
      totalCER: encounter.totalCER,
      actualThreatLevel: encounter.actualThreatLevel,
      encounterType: encounter.encounterType
    };
  }
}

export default DFRPGEncounterGenerator;
