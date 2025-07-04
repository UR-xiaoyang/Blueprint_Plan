const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const api = require('./backend.cjs');
const p2p = require('./p2p-backend.cjs');
const Y = require('yjs');

let mainWindow; // Keep a reference to the main window

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: '计划委员会',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenu(null);

  // Load the Vite development server URL or the built HTML file
  const devServerURL = 'http://localhost:5173'; // Default Vite dev server port
  const buildPath = path.join(__dirname, '../dist/index.html');

  // Use app.isPackaged to determine if in development or production
  if (!app.isPackaged) {
    mainWindow.loadURL(devServerURL).catch(err => {
      console.error('Failed to load dev server URL, retrying...', err);
      setTimeout(() => {
        mainWindow.loadURL(devServerURL);
      }, 2000); // Wait 2 seconds and retry
    });
    // Open the DevTools automatically in development mode.
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(buildPath);
  }
}

app.whenReady().then(() => {
  // Initialize P2P backend persistence
  p2p.initialize(app.getPath('userData'));

  createWindow();

  // Listen for updates on the backend Y.Doc and send them to the renderer.
  p2p.ydoc.on('update', (update, origin) => {
    // Avoid echoing updates that came from the renderer itself.
    if (origin !== 'renderer' && mainWindow) {
      mainWindow.webContents.send('yjs:update-from-main', new Uint8Array(update));
    }
  });

  // Register F12 to open DevTools
  globalShortcut.register('F12', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.toggleDevTools();
    }
  });

  // Set up IPC handlers
  ipcMain.handle('getAllPlans', async () => {
    return api.getAllPlans();
  });
  ipcMain.handle('saveAllPlans', async (event, plans) => {
    return api.saveAllPlans(plans);
  });
  ipcMain.handle('createPlan', async (event, plan) => {
    return api.createPlan(plan);
  });
  ipcMain.handle('updatePlan', async (event, plan) => {
    return api.updatePlan(plan);
  });
  ipcMain.handle('deletePlan', async (event, planId) => {
    return api.deletePlan(planId);
  });
  ipcMain.handle('createTask', async (event, planId, task) => {
    return api.createTask(planId, task);
  });
  ipcMain.handle('updateTask', async (event, task) => {
    return api.updateTask(task);
  });
  ipcMain.handle('deleteTask', async (event, planId, taskId) => {
    return api.deleteTask(planId, taskId);
  });
  ipcMain.handle('getStatistics', async () => {
    return api.getStatistics();
  });
  ipcMain.handle('exportData', async () => {
    return api.exportData();
  });
  ipcMain.handle('importData', async (event, jsonData) => {
    return api.importData(jsonData);
  });
  ipcMain.handle('greet', async (event, name) => {
    return api.greet(name);
  });

  // --- Yjs Sync IPC Handlers ---
  ipcMain.handle('yjs:get-initial-state', async () => {
    return Y.encodeStateAsUpdate(p2p.ydoc);
  });

  ipcMain.on('yjs:update-from-renderer', (event, update) => {
    // When an update is received from the renderer, apply it to the main process's ydoc.
    // Use 'renderer' as the origin to prevent echoing it back.
    Y.applyUpdate(p2p.ydoc, new Uint8Array(update), 'renderer');
  });
});

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
