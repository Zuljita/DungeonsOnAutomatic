import type { Dungeon, SystemModule } from '../core/types';
import { generic } from '../systems/generic';

export interface SystemInfo {
  id: string;
  label: string;
  description?: string;
}

const BUILTIN_SYSTEMS: SystemInfo[] = [
  { id: 'generic', label: 'Generic Fantasy', description: 'Basic fantasy dungeon system' },
  { id: 'dfrpg', label: 'Dungeon Fantasy RPG', description: 'GURPS Dungeon Fantasy system' }
];

// Plugin loading is only available in Node.js environments
let pluginLoader: any = null;
let pluginsDiscovered = false;

async function initializePluginLoader() {
  // Only load plugins in Node.js environment (not browser)
  if (typeof window === 'undefined' && !pluginsDiscovered) {
    try {
      const { createDefaultPluginLoader } = await import('./plugin-loader');
      const { isSystemPlugin } = await import('../core/plugin-types');
      
      pluginLoader = createDefaultPluginLoader();
      await pluginLoader.discover();
      pluginsDiscovered = true;
    } catch (error) {
      console.warn('Plugin loading not available in this environment:', error);
      pluginsDiscovered = true; // Mark as attempted
    }
  }
}

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
  
  // Try to load as plugin (only in Node.js environment)
  await initializePluginLoader();
  if (!pluginLoader) {
    throw new Error(`Unknown system: ${name} (plugins not available in browser)`);
  }
  
  const { isSystemPlugin } = await import('../core/plugin-types');
  const plugin = await pluginLoader.load(name).catch((err: any) => {
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
  // Only include plugin systems if plugin loader is available (Node.js environment)
  if (!pluginLoader) {
    return BUILTIN_SYSTEMS;
  }
  
  const pluginSystems = pluginLoader
    .getRegistry()
    .filter((p: any) => p.type === 'system')
    .map((p: any) => ({
      id: p.metadata.id,
      label: (p.metadata as any).name || p.metadata.id,
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
