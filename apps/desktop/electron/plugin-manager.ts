import { createDefaultPluginLoader } from '@src/services/plugin-loader';
import type { PluginLoader } from '@src/services/plugin-loader';
import type { BasePlugin, SystemPlugin, ExportPlugin } from '@src/core/plugin-types';
import path from 'node:path';

/**
 * PluginManager handles plugin operations in the Electron main process
 * Provides a bridge between the renderer process and the Node.js plugin system
 */
export class PluginManager {
  private loader: PluginLoader;
  private loadedPlugins: Map<string, BasePlugin> = new Map();

  constructor() {
    // Create plugin loader with desktop-specific plugin paths
    const desktopPluginsDir = path.resolve(__dirname, '../../plugins');
    const corePluginsDir = path.resolve(__dirname, '../../../../src/plugins');
    const distPluginsDir = path.resolve(__dirname, '../../../../dist/plugins');
    
    this.loader = createDefaultPluginLoader();
    console.log('PluginManager initialized with paths:', {
      desktop: desktopPluginsDir,
      core: corePluginsDir,
      dist: distPluginsDir,
    });
  }

  /**
   * Discover all available plugins
   */
  async discoverPlugins() {
    try {
      const plugins = await this.loader.discover();
      console.log(`Discovered ${plugins.length} plugins:`, plugins.map(p => p.metadata?.id || 'unknown'));
      return plugins.map(plugin => ({
        id: plugin.metadata?.id || 'unknown',
        name: plugin.metadata?.id || 'Unknown Plugin', // Use id as name
        version: plugin.metadata?.version || '1.0.0',
        description: plugin.metadata?.description || 'No description available',
        type: plugin.type,
        installed: plugin.installed,
        enabled: plugin.enabled,
      }));
    } catch (error) {
      console.error('Failed to discover plugins:', error);
      return [];
    }
  }

  /**
   * Load a plugin by ID
   */
  async loadPlugin(id: string) {
    try {
      if (this.loadedPlugins.has(id)) {
        console.log(`Plugin ${id} already loaded`);
        return this.loadedPlugins.get(id);
      }

      console.log(`Loading plugin: ${id}`);
      const plugin = await this.loader.load(id, { sandbox: false }); // Trust desktop plugins
      this.loadedPlugins.set(id, plugin);
      
      console.log(`Successfully loaded plugin: ${id}`, {
        id: plugin.metadata?.id,
        version: plugin.metadata?.version,
      });
      
      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin ${id}:`, error);
      throw error;
    }
  }

  /**
   * Generate a dungeon using a system plugin
   */
  async generateDungeon(systemId: string, config: any) {
    try {
      console.log(`Generating dungeon with system: ${systemId}`, config);
      
      // Load the system plugin if not already loaded
      const systemPlugin = await this.loadPlugin(systemId) as SystemPlugin;
      
      if (!systemPlugin) {
        throw new Error(`System plugin ${systemId} could not be loaded`);
      }
      
      if (typeof (systemPlugin as any).enrich !== 'function') {
        throw new Error(`System plugin ${systemId} does not have enrich capability`);
      }

      // Import the core dungeon builder
      const { buildDungeon } = await import('@src/services/assembler');
      
      // Generate base dungeon structure
      const baseDungeon = await buildDungeon(config);
      
      // Enrich with system-specific content
      const enrichedDungeon = await (systemPlugin as any).enrich(baseDungeon, config);
      
      console.log(`Successfully generated dungeon with ${enrichedDungeon.rooms.length} rooms`);
      return enrichedDungeon;
    } catch (error) {
      console.error(`Failed to generate dungeon with system ${systemId}:`, error);
      throw error;
    }
  }

  /**
   * Export a dungeon using an export plugin
   */
  async exportDungeon(pluginId: string, dungeon: any, options: any = {}) {
    try {
      console.log(`Exporting dungeon with plugin: ${pluginId}`, options);
      
      // Load the export plugin if not already loaded
      const exportPlugin = await this.loadPlugin(pluginId) as ExportPlugin;
      
      if (!exportPlugin || typeof (exportPlugin as any).export !== 'function') {
        throw new Error(`Export plugin ${pluginId} does not have export capability`);
      }

      // Export the dungeon
      const result = await (exportPlugin as any).export(dungeon, 'svg', options);
      
      console.log(`Successfully exported dungeon using ${pluginId}`);
      return result;
    } catch (error) {
      console.error(`Failed to export dungeon with plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(id: string) {
    try {
      if (this.loadedPlugins.has(id)) {
        await this.loader.unload(id);
        this.loadedPlugins.delete(id);
        console.log(`Successfully unloaded plugin: ${id}`);
      }
    } catch (error) {
      console.error(`Failed to unload plugin ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get list of loaded plugins
   */
  getLoadedPlugins() {
    return Array.from(this.loadedPlugins.keys()).map(id => ({
      id,
      plugin: this.loadedPlugins.get(id),
    }));
  }

  /**
   * Install plugin from Git repository
   */
  async installFromGit(gitUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execPromise = promisify(exec);
      
      // Extract plugin name from Git URL
      const match = gitUrl.match(/\/([^/]+?)(?:\.git)?$/);
      if (!match) {
        throw new Error('Invalid Git URL format');
      }
      
      const pluginName = match[1];
      const pluginDir = path.resolve(__dirname, '../../plugins', pluginName);
      
      console.log(`Installing plugin ${pluginName} from ${gitUrl} to ${pluginDir}`);
      
      // Check if plugin directory already exists
      const fs = await import('fs');
      if (fs.existsSync(pluginDir)) {
        throw new Error(`Plugin ${pluginName} already exists`);
      }
      
      // Clone the repository
      const { stdout, stderr } = await execPromise(`git clone ${gitUrl} "${pluginDir}"`);
      console.log('Git clone output:', stdout);
      if (stderr) console.warn('Git clone warnings:', stderr);
      
      // Validate plugin structure
      const packageJsonPath = path.join(pluginDir, 'package.json');
      const indexPath = path.join(pluginDir, 'index.ts');
      
      if (!fs.existsSync(packageJsonPath) || !fs.existsSync(indexPath)) {
        // Clean up invalid plugin
        fs.rmSync(pluginDir, { recursive: true, force: true });
        throw new Error('Invalid plugin structure: missing package.json or index.ts');
      }
      
      // Rediscover plugins to include the new one
      await this.discoverPlugins();
      
      return { 
        success: true, 
        message: `Plugin ${pluginName} installed successfully` 
      };
      
    } catch (error) {
      console.error('Plugin installation failed:', error);
      throw new Error(`Installation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<{ success: boolean; message: string }> {
    try {
      const fs = await import('fs');
      
      // Find plugin directory
      const possiblePaths = [
        path.resolve(__dirname, '../../plugins', pluginId),
        path.resolve(__dirname, '../../../../src/plugins', pluginId),
        path.resolve(__dirname, '../../../../dist/plugins', pluginId),
      ];
      
      let pluginDir = null;
      for (const pluginPath of possiblePaths) {
        if (fs.existsSync(pluginPath)) {
          pluginDir = pluginPath;
          break;
        }
      }
      
      if (!pluginDir) {
        throw new Error(`Plugin ${pluginId} not found`);
      }
      
      // Don't allow uninstalling built-in plugins
      if (pluginDir.includes('src/plugins') || pluginDir.includes('dist/plugins')) {
        throw new Error('Cannot uninstall built-in plugins');
      }
      
      // Remove from loaded plugins
      this.loadedPlugins.delete(pluginId);
      
      // Remove plugin directory
      fs.rmSync(pluginDir, { recursive: true, force: true });
      
      // Rediscover plugins
      await this.discoverPlugins();
      
      return { 
        success: true, 
        message: `Plugin ${pluginId} uninstalled successfully` 
      };
      
    } catch (error) {
      console.error('Plugin uninstallation failed:', error);
      throw new Error(`Uninstallation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Toggle plugin enabled/disabled state
   */
  async togglePlugin(pluginId: string): Promise<{ success: boolean; enabled: boolean; message: string }> {
    try {
      const plugin = this.loadedPlugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }
      
      // For now, we'll implement this as unload/reload
      // In a more advanced implementation, you could have an enabled/disabled state
      const wasLoaded = this.loadedPlugins.has(pluginId);
      
      if (wasLoaded) {
        // "Disable" by removing from loaded plugins
        this.loadedPlugins.delete(pluginId);
        return { 
          success: true, 
          enabled: false,
          message: `Plugin ${pluginId} disabled` 
        };
      } else {
        // "Enable" by loading the plugin
        await this.loadPlugin(pluginId);
        return { 
          success: true, 
          enabled: true,
          message: `Plugin ${pluginId} enabled` 
        };
      }
      
    } catch (error) {
      console.error('Plugin toggle failed:', error);
      throw new Error(`Toggle failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}