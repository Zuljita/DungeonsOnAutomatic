import type { Dungeon, SystemModule } from '../core/types';
import { generic } from '../systems/generic';
import { createDefaultPluginLoader } from './plugin-loader';
import { isSystemPlugin } from '../core/plugin-types';

export interface SystemInfo {
  id: string;
  label: string;
  description?: string;
}

const BUILTIN_SYSTEMS: SystemInfo[] = [
  { id: 'generic', label: 'Generic Fantasy', description: 'Basic fantasy dungeon system' },
  { id: 'dfrpg', label: 'Dungeon Fantasy RPG', description: 'GURPS Dungeon Fantasy system' }
];

const pluginLoader = createDefaultPluginLoader();
await pluginLoader.discover();

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
  // Try to load as plugin
  const plugin = await pluginLoader.load(name).catch((err) => {
    throw new Error(`Unknown system: ${name}: ${err}`);
  });
  if (!isSystemPlugin(plugin)) {
    throw new Error(`Plugin ${name} is not a system plugin`);
  }
  if (rng) {
    const base = plugin;
    return {
      ...base,
      enrich(d: Dungeon, opts?: Record<string, unknown>) {
        const options = { ...(opts ?? {}), rng };
        return base.enrich(d, options as any);
      }
    };
  }
  return plugin;
}

export function getSystems(): SystemInfo[] {
  const pluginSystems = pluginLoader
    .getRegistry()
    .filter((p) => p.type === 'system')
    .map((p) => ({
      id: p.metadata.id,
      label: p.metadata.name || p.metadata.id,
      description: p.metadata.description,
    }));
  return [...BUILTIN_SYSTEMS, ...pluginSystems];
}

export async function getSystem(name: string): Promise<SystemModule> {
  return loadSystemModule(name);
}

// Export a singleton instance for the GUI
export const systemLoader = {
  getSystems,
  getSystem
};
