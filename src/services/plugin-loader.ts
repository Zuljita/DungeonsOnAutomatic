import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import semver from 'semver';
import type { BasePlugin, PluginInfo, PluginType } from '../core/plugin-types';
import { validatePluginMetadata } from '../core/plugin-types';
import pkg from '../../package.json' assert { type: 'json' };

const CORE_VERSION = pkg.version as string;

/**
 * PluginLoader handles discovery, loading, and unloading of plugins.
 * It scans configured directories for plugin packages and safely loads
 * plugin modules with error boundaries and dependency checks.
 */
export class PluginLoader {
  private pluginDirs: string[];
  private registry: Map<string, PluginInfo> = new Map();
  private cache: Map<string, BasePlugin> = new Map();
  private discovered = false;

  constructor(pluginDirs: string[]) {
    this.pluginDirs = pluginDirs;
  }

  /**
     * Scan plugin directories for package.json files containing
     * doaPlugin metadata. Builds the internal plugin registry.
     */
  async discover(): Promise<PluginInfo[]> {
    if (this.discovered) return [...this.registry.values()];
    for (const dir of this.pluginDirs) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const pkgPath = path.join(dir, entry.name, 'package.json');
          try {
            await fs.access(pkgPath);
          } catch {
            continue;
          }
          try {
            const pkgRaw = await fs.readFile(pkgPath, 'utf-8');
            const pkgJson = JSON.parse(pkgRaw);
            const doaPlugin = pkgJson.doaPlugin;
            if (!doaPlugin) continue;
            const metadata = validatePluginMetadata({
              ...doaPlugin,
              version: pkgJson.version,
            });
            const info: PluginInfo = {
              metadata,
              type: doaPlugin.type as PluginType,
              installed: true,
              enabled: true,
              loadPath: path.join(dir, entry.name, pkgJson.main || 'index.js'),
            };
            this.registry.set(metadata.id, info);
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
              console.warn(`Failed to parse plugin at ${pkgPath}:`, err);
            }
            continue;
          }
        }
      } catch (err) {
        // Directory may not exist; skip quietly
        continue;
      }
    }
    this.discovered = true;
    return [...this.registry.values()];
  }

  getRegistry(): PluginInfo[] {
    return [...this.registry.values()];
  }

  /**
   * Load a plugin by id. Performs compatibility and dependency checks
   * and caches loaded plugins for reuse.
   */
  async load(id: string): Promise<BasePlugin> {
    if (this.cache.has(id)) return this.cache.get(id)!;
    if (!this.discovered) await this.discover();
    const info = this.registry.get(id);
    if (!info || !info.loadPath) {
      throw new Error(`Plugin not found: ${id}`);
    }
    // Check core compatibility
    if (!semver.satisfies(CORE_VERSION, info.metadata.compatibility)) {
      throw new Error(
        `Plugin ${id} requires DOA version ${info.metadata.compatibility} but current version is ${CORE_VERSION}`
      );
    }
    // Check dependencies
    const deps = info.metadata.dependencies;
    if (deps.systems) {
      for (const dep of deps.systems) {
        if (!this.registry.has(dep)) {
          throw new Error(`Plugin ${id} missing required system dependency ${dep}`);
        }
      }
    }
    if (deps.plugins) {
      for (const dep of deps.plugins) {
        if (!this.registry.has(dep)) {
          throw new Error(`Plugin ${id} missing required plugin dependency ${dep}`);
        }
      }
    }
    let mod: any;
    try {
      const url = pathToFileURL(info.loadPath).href;
      mod = await import(url);
    } catch (err) {
      throw new Error(`Failed to load plugin module at ${info.loadPath}: ${err}`);
    }
    const plugin: BasePlugin = mod.default || mod;
    plugin.metadata = plugin.metadata || info.metadata;
    if (typeof plugin.initialize === 'function') {
      try {
        await plugin.initialize(plugin.getDefaultConfig?.());
      } catch (err) {
        throw new Error(`Plugin ${id} failed to initialize: ${err}`);
      }
    }
    this.cache.set(id, plugin);
    return plugin;
  }

  /** Unload a previously loaded plugin */
  async unload(id: string): Promise<void> {
    const plugin = this.cache.get(id);
    if (!plugin) return;
    if (typeof plugin.cleanup === 'function') {
      try {
        await plugin.cleanup();
      } catch (err) {
        console.warn(`Plugin ${id} cleanup failed:`, err);
      }
    }
    this.cache.delete(id);
  }
}

/** Utility to create default plugin loader using standard paths */
export function createDefaultPluginLoader(): PluginLoader {
  const pluginDir = path.resolve(process.cwd(), 'plugins');
  const nodeModules = path.resolve(process.cwd(), 'node_modules');
  return new PluginLoader([pluginDir, nodeModules]);
}

export type { PluginInfo };
