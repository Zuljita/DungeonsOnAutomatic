import { Dungeon, SystemModule } from '../core/types';

export const generic: SystemModule = {
  id: 'generic',
  label: 'Generic (no system)',
  enrich(d: Dungeon): Dungeon {
    return d;
  }
};

export default generic;
