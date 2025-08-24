import { contextBridge, ipcRenderer } from 'electron';
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    // Plugin system (to be implemented in Phase 4)
    plugins: {
        list: () => ipcRenderer.invoke('plugins:list'),
        load: (id) => ipcRenderer.invoke('plugins:load', id),
        generateDungeon: (systemId, config) => ipcRenderer.invoke('plugins:generateDungeon', systemId, config),
        export: (pluginId, dungeon, options) => ipcRenderer.invoke('plugins:export', pluginId, dungeon, options),
    }
});
