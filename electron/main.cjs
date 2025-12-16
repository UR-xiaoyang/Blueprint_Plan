const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// Set user data path before app is ready to avoid cache issues
const userDataPath = path.join(app.getPath('appData'), 'Blueprint-Plan');
app.setPath('userData', userDataPath);
// Explicitly set a writable cache directory to avoid Windows cache permission issues
const userCachePath = path.join(userDataPath, 'Cache');
try { fs.mkdirSync(userCachePath, { recursive: true }); } catch (_) {}
app.setPath('userCache', userCachePath);
// Disable hardware acceleration to prevent GPU cache initialization errors on some systems
app.disableHardwareAcceleration();

const api = require('./backend.cjs');

let mainWindow; // Keep a reference to the main window

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: '计划委员会',
    frame: false, // 移除系统标题栏
    backgroundColor: '#000000', // 防止加载时出现白屏
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenu(null);

  const loadDevServer = (url, retries = 5) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    mainWindow.loadURL(url).then(() => {
      console.log('Dev server loaded successfully!');
    }).catch(err => {
      console.error(`Failed to load dev server at ${url}, retrying... (${retries} left). Error: ${err.message}`);
      if (retries > 0) {
        setTimeout(() => {
          loadDevServer(url, retries - 1);
        }, 2000); // Wait 2 seconds and retry
      } else {
        console.error('Could not connect to dev server. Please start it manually and restart the app.');
      }
    });
  };

  // Load the Vite development server URL or the built HTML file
  const devServerURL = 'http://localhost:8079'; // Vite dev server port
  const buildPath = path.join(__dirname, '../dist/index.html');

  // Use app.isPackaged to determine if in development or production
  if (!app.isPackaged) {
    loadDevServer(devServerURL);
    // 仅当设置中的调试模式开启时才打开 DevTools，统一由复选框控制
    try {
      const s = api.getSettings();
      if (s && !!s.debugMode) {
        // Wait for DOM to be ready before opening DevTools to avoid connection errors
        mainWindow.webContents.once('dom-ready', () => {
          mainWindow.webContents.openDevTools();
        });
      }
    } catch (_) {}
  } else {
    mainWindow.loadFile(buildPath);
  }
}

app.whenReady().then(() => {
  createWindow();

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

  ipcMain.handle('getSettings', async () => {
    return api.getSettings();
  });

  ipcMain.handle('saveSettings', async (event, settings) => {
    const ok = api.saveSettings(settings);
    return ok;
  });

  ipcMain.handle('toggle-dev-tools', (event, open) => {
    if (mainWindow) {
      if (open) {
        mainWindow.webContents.openDevTools();
      } else {
        mainWindow.webContents.closeDevTools();
      }
    }
  });

  ipcMain.handle('get-app-version', async () => {
    return { ok: true, version: app.getVersion() };
  });

  // Window control handlers
  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window-close', () => {
    mainWindow?.close();
  });
});

app.on('window-all-closed', () => {
  console.log('Window all closed event triggered');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});