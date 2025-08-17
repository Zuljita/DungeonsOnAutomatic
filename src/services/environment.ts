import { customDataLoader } from './custom-data-loader';
import lightingDefaults from '../data/environment/lighting.json';
import ceilingDefaults from '../data/environment/ceilings.json';
import manaDefaults from '../data/environment/dfrpg-mana-levels.json';
import sanctityDefaults from '../data/environment/dfrpg-sanctity-levels.json';
import natureDefaults from '../data/environment/dfrpg-natures-strength.json';
import { EnvironmentalDetail, DungeonEnvironment } from '../core/types';

export class EnvironmentService {
  constructor(private rng: () => number = Math.random) {}

  private weightedPick(items: EnvironmentalDetail[]): EnvironmentalDetail {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.rng() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll < 0) return item;
    }
    return items[0];
  }

  getLighting(): EnvironmentalDetail {
    const data = customDataLoader.getEnvironmentData('lighting', lightingDefaults as EnvironmentalDetail[]);
    return this.weightedPick(data);
  }

  getCeiling(): EnvironmentalDetail {
    const data = customDataLoader.getEnvironmentData('ceilings', ceilingDefaults as EnvironmentalDetail[]);
    return this.weightedPick(data);
  }

  getManaLevel(): EnvironmentalDetail {
    const data = customDataLoader.getEnvironmentData('dfrpg-mana-levels', manaDefaults as EnvironmentalDetail[]);
    return this.weightedPick(data);
  }

  getSanctityLevel(): EnvironmentalDetail {
    const data = customDataLoader.getEnvironmentData('dfrpg-sanctity-levels', sanctityDefaults as EnvironmentalDetail[]);
    return this.weightedPick(data);
  }

  getNaturesStrength(): EnvironmentalDetail {
    const data = customDataLoader.getEnvironmentData('dfrpg-natures-strength', natureDefaults as EnvironmentalDetail[]);
    return this.weightedPick(data);
  }

  generate(includeDfrpg: boolean = false): DungeonEnvironment {
    const env: DungeonEnvironment = {
      lighting: this.getLighting(),
      ceiling: this.getCeiling()
    };

    if (includeDfrpg) {
      env.manaLevel = this.getManaLevel();
      env.sanctityLevel = this.getSanctityLevel();
      env.naturesStrength = this.getNaturesStrength();
    }

    return env;
  }
}

export const createEnvironmentService = (rng: () => number = Math.random) =>
  new EnvironmentService(rng);

