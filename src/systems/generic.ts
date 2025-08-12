import { Dungeon, SystemModule } from '../core/types';

export const generic: SystemModule = {
  id: 'generic',
  label: 'Generic (no system)',
  enrich(d: Dungeon, opts?: Record<string, unknown>): Dungeon {
    void opts;
    return d;
  }
};

export default generic;
