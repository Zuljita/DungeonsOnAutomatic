import type { SystemModule } from '../core/types.js';
import generic from '../systems/generic.js';

export async function loadSystemModule(name?: string): Promise<SystemModule> {
  if (!name || name === 'generic') return generic;
  if (name === 'dfrpg') {
    const mod = await import('../systems/dfrpg/index.js');
    return mod.default;
  }
  // fallback
  return generic;
}
