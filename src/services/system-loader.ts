import type { SystemModule } from '../core/types';
import generic from '../systems/generic';

export async function loadSystemModule(name?: string): Promise<SystemModule> {
  if (!name || name === 'generic') return generic;
  if (name === 'dfrpg') {
    const mod = await import('../systems/dfrpg/index');
    return mod.default;
  }
  // fallback
  return generic;
}
