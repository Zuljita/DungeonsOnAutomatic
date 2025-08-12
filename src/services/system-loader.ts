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
          return base.enrich(d, { ...(opts as any), rng });
        }
      };
    }
    return mod.default;
  }
  // fallback
  return generic;
}
