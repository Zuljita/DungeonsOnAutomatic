import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // Plugin system (to be implemented in Phase 4)
  plugins: {
    list: () => ipcRenderer.invoke('plugins:list'),
    load: (id: string) => ipcRenderer.invoke('plugins:load', id),
    generateDungeon: (systemId: string, config: any) => 
      ipcRenderer.invoke('plugins:generateDungeon', systemId, config),
    export: (pluginId: string, dungeon: any, options: any) =>
      ipcRenderer.invoke('plugins:export', pluginId, dungeon, options),
    // Plugin management
    installFromGit: (gitUrl: string) => ipcRenderer.invoke('plugins:installFromGit', gitUrl),
    uninstall: (pluginId: string) => ipcRenderer.invoke('plugins:uninstall', pluginId),
    toggle: (pluginId: string) => ipcRenderer.invoke('plugins:toggle', pluginId),
  }
});

// Type definitions for renderer process
export interface ElectronAPI {
  getVersion: () => Promise<string>;
  plugins: {
    list: () => Promise<any[]>;
    load: (id: string) => Promise<any>;
    generateDungeon: (systemId: string, config: any) => Promise<any>;
    export: (pluginId: string, dungeon: any, options: any) => Promise<any>;
    installFromGit: (gitUrl: string) => Promise<{ success: boolean; message: string }>;
    uninstall: (pluginId: string) => Promise<{ success: boolean; message: string }>;
    toggle: (pluginId: string) => Promise<{ success: boolean; enabled: boolean; message: string }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}