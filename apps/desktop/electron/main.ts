import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PluginManager } from './plugin-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;
let pluginManager: PluginManager;

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false, // Security best practice
      contextIsolation: true, // Security best practice  
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // Don't show until ready
  });

  // Load the renderer
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(async () => {
  // Initialize plugin manager
  pluginManager = new PluginManager();
  
  // Discover plugins on startup
  try {
    await pluginManager.discoverPlugins();
    console.log('Plugins discovered successfully');
  } catch (error) {
    console.error('Failed to discover plugins:', error);
  }
  
  createWindow();

  // macOS: Re-create window when dock icon clicked and no other windows open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});

// IPC handlers for plugin communication
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('plugins:list', async () => {
  try {
    return await pluginManager.discoverPlugins();
  } catch (error) {
    console.error('Failed to list plugins:', error);
    throw error;
  }
});

ipcMain.handle('plugins:load', async (event, id: string) => {
  try {
    return await pluginManager.loadPlugin(id);
  } catch (error) {
    console.error(`Failed to load plugin ${id}:`, error);
    throw error;
  }
});

ipcMain.handle('plugins:generateDungeon', async (event, systemId: string, config: any) => {
  try {
    return await pluginManager.generateDungeon(systemId, config);
  } catch (error) {
    console.error(`Failed to generate dungeon with system ${systemId}:`, error);
    throw error;
  }
});

ipcMain.handle('plugins:export', async (event, pluginId: string, dungeon: any, options: any) => {
  try {
    return await pluginManager.exportDungeon(pluginId, dungeon, options);
  } catch (error) {
    console.error(`Failed to export dungeon with plugin ${pluginId}:`, error);
    throw error;
  }
});

// Plugin management IPC handlers
ipcMain.handle('plugins:installFromGit', async (event, gitUrl: string) => {
  try {
    return await pluginManager.installFromGit(gitUrl);
  } catch (error) {
    console.error(`Failed to install plugin from ${gitUrl}:`, error);
    throw error;
  }
});

ipcMain.handle('plugins:uninstall', async (event, pluginId: string) => {
  try {
    return await pluginManager.uninstallPlugin(pluginId);
  } catch (error) {
    console.error(`Failed to uninstall plugin ${pluginId}:`, error);
    throw error;
  }
});

ipcMain.handle('plugins:toggle', async (event, pluginId: string) => {
  try {
    return await pluginManager.togglePlugin(pluginId);
  } catch (error) {
    console.error(`Failed to toggle plugin ${pluginId}:`, error);
    throw error;
  }
});

export { mainWindow, pluginManager };