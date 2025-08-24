import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Keep a global reference of the window object
let mainWindow = null;
function createWindow() {
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
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
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
app.whenReady().then(() => {
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
    contents.on('new-window', (event) => {
        event.preventDefault();
    });
});
// IPC handlers will be added here for plugin communication
ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
});
export { mainWindow };
