import type { Dungeon } from '../core/types';
import type { RenderPlugin, RenderOptions, RenderResult } from '../core/plugin-types';
import { isRenderPlugin } from '../core/plugin-types';
import { createDefaultPluginLoader } from './plugin-loader';

/**
 * RenderPluginService manages render plugins and provides style-based rendering
 */
class RenderPluginService {
  private plugins = new Map<string, RenderPlugin>();
  private pluginLoader = createDefaultPluginLoader();
  private initialized = false;

  /**
   * Initialize the render plugin service by discovering and loading render plugins
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Skip plugin loading in browser environment
    const isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
      console.debug('Browser environment detected, skipping render plugin loading');
      this.initialized = true;
      return;
    }
    
    try {
      await this.pluginLoader.discover();
      const pluginInfos = this.pluginLoader.getRegistry();
      
      for (const info of pluginInfos) {
        if (info.type === 'render' || info.metadata.tags?.includes('render')) {
          try {
            const plugin = await this.pluginLoader.load(info.metadata.id);
            if (isRenderPlugin(plugin)) {
              this.plugins.set(info.metadata.id, plugin);
            }
          } catch (error) {
            console.warn(`Failed to load render plugin ${info.metadata.id}:`, error);
          }
        }
      }
      
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize render plugins, continuing without plugins:', error);
      this.initialized = true; // Continue without plugins
    }
  }

  /**
   * Get available render styles from all loaded plugins
   */
  getAvailableStyles(): string[] {
    const styles = new Set<string>();
    
    for (const plugin of this.plugins.values()) {
      for (const style of plugin.supportedStyles) {
        styles.add(style);
      }
    }
    
    return Array.from(styles);
  }

  /**
   * Find plugin that supports the given style
   */
  private findPluginForStyle(style: string): RenderPlugin | null {
    for (const plugin of this.plugins.values()) {
      if (plugin.supportedStyles.includes(style)) {
        return plugin;
      }
    }
    return null;
  }

  /**
   * Render dungeon using plugin-based style if available
   */
  async renderWithStyle(
    dungeon: Dungeon, 
    style: string, 
    options?: RenderOptions
  ): Promise<RenderResult | null> {
    await this.initialize();
    
    const plugin = this.findPluginForStyle(style);
    if (!plugin) {
      return null; // Style not supported by any plugin
    }

    try {
      const result = await plugin.render(dungeon, style, options);
      return result;
    } catch (error) {
      console.warn(`Render plugin failed for style ${style}:`, error);
      return null;
    }
  }

  /**
   * Check if a style is supported by any loaded plugin
   */
  async isStyleSupported(style: string): Promise<boolean> {
    await this.initialize();
    return this.findPluginForStyle(style) !== null;
  }

  /**
   * Get plugin metadata for debugging
   */
  getLoadedPlugins(): Array<{ id: string; supportedStyles: string[] }> {
    return Array.from(this.plugins.values()).map(plugin => ({
      id: plugin.metadata.id,
      supportedStyles: plugin.supportedStyles
    }));
  }
}

// Export singleton instance
export const renderPluginService = new RenderPluginService();