import type { Dungeon, SystemModule } from '../core/types';
import generic from '../systems/generic';

export async function loadSystemModule(
  name?: string,
  rng?: () => number
): Promise<SystemModule> {
  let mod: SystemModule;
  if (!name || name === 'generic') {
    mod = generic;
  } else if (name === 'dfrpg') {
    const m = await import('../systems/dfrpg/index');
    mod = m.default;
  } else {
    // fallback
    mod = generic;
  }

  if (!rng) return mod;

  const originalEnrich = mod.enrich.bind(mod);
  return {
    ...mod,
    enrich(d: Dungeon, opts?: Record<string, unknown>) {
      return originalEnrich(d, { rng, ...(opts ?? {}) });
    }
  };
}
