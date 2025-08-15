import type { Dungeon, SystemModule } from '../core/types';
import { generic } from '../systems/generic';

export interface SystemInfo {
  id: string;
  label: string;
  description?: string;
}

const AVAILABLE_SYSTEMS: SystemInfo[] = [
  { id: 'generic', label: 'Generic Fantasy', description: 'Basic fantasy dungeon system' },
  { id: 'dfrpg', label: 'Dungeon Fantasy RPG', description: 'GURPS Dungeon Fantasy system' }
];

export async function loadSystemModule(name?: string, rng?: () => number): Promise<SystemModule> {
  if (!name || name === 'generic') return generic;
  if (name === 'dfrpg') {
    const mod = await import('../systems/dfrpg/index');
    if (rng) {
      const base = mod.default;
      return {
        ...base,
        enrich(d: Dungeon, opts?: Record<string, unknown>) {
          const options = { ...(opts ?? {}), rng } as { sources?: string[]; rng?: () => number };
          return base.enrich(d, options);
        }
      };
    }
    return mod.default;
  }
  throw new Error(`Unknown system: ${name}`);
}

export function getSystems(): SystemInfo[] {
  return AVAILABLE_SYSTEMS;
}

export async function getSystem(name: string): Promise<SystemModule> {
  return loadSystemModule(name);
}

// Export a singleton instance for the GUI
export const systemLoader = {
  getSystems,
  getSystem
};
