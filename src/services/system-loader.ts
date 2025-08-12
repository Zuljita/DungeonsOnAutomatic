import type { Dungeon, SystemModule } from '../core/types';
import generic from '../systems/generic';

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
