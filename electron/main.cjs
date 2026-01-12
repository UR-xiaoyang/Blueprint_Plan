const { app, BrowserWindow, ipcMain, globalShortcut, dialog, Tray, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Application Error', `An unexpected error occurred:\n${error.message}\n\n${error.stack}`);
  app.quit();
});

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
let tray = null;
let isQuitting = false; // Flag to indicate if we are really quitting

function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, '../src/assets/react.svg'); // Use a valid icon path, ensure it exists or use default
  // Note: tray icon usually requires .ico on Windows, .png on Mac/Linux. 
  
  // Determine icon path based on environment
  let trayIconPath;
  if (app.isPackaged) {
    // In production, resources are in resourcesPath or dist
    trayIconPath = path.join(__dirname, '../dist/icon.png');
  } else {
    // In development
    trayIconPath = path.join(__dirname, '../public/icon.png');
  }

  // Fallback if png doesn't exist (though we just copied it)
  if (!fs.existsSync(trayIconPath)) {
    console.warn('Tray icon not found at:', trayIconPath);
    // Try svg as last resort
    trayIconPath = app.isPackaged 
      ? path.join(__dirname, '../dist/vite.svg')
      : path.join(__dirname, '../public/vite.svg');
  }
  
  try {
    tray = new Tray(trayIconPath);
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: '显示主界面', 
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        } 
      },
      { 
        label: '退出', 
        click: () => {
          isQuitting = true;
          app.quit();
        } 
      }
    ]);
    tray.setToolTip('计划委员会');
    tray.setContextMenu(contextMenu);
    
    tray.on('double-click', () => {
       if (mainWindow) {
         mainWindow.show();
         mainWindow.focus();
       }
    });
  } catch (e) {
    console.error("Failed to create tray:", e);
  }
}

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

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handle close event to minimize to tray if enabled
  mainWindow.on('close', (event) => {
    if (isQuitting) return;

    const settings = api.getSettings();
    if (settings.closeToTray) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    // If not close to tray, let it close naturally.
    // However, if we want to keep running in background?
    // User said "add ability to run in background, settable in settings".
    // Usually this means "Close to Tray".
  });

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
  
  // Create Tray
  createTray();

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

// Add IPC handler for opening external links manually if needed
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

// Extension/DLC Management
ipcMain.handle('loadExtensions', async () => {
  const extensionsPath = path.join(app.getPath('userData'), 'extensions');
  try {
    // Ensure extensions directory exists
    await fs.promises.mkdir(extensionsPath, { recursive: true });
    
    const entries = await fs.promises.readdir(extensionsPath, { withFileTypes: true });
    const extensions = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const extPath = path.join(extensionsPath, entry.name);
        const manifestPath = path.join(extPath, 'manifest.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const manifestContent = await fs.promises.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            
            // Read entry script if exists
            let scriptContent = '';
            let scriptPath = '';
            
            if (manifest.main) {
                scriptPath = path.join(extPath, manifest.main);
            } else if (fs.existsSync(path.join(extPath, 'index.js'))) {
                scriptPath = path.join(extPath, 'index.js');
            }

            if (scriptPath && fs.existsSync(scriptPath)) {
                scriptContent = await fs.promises.readFile(scriptPath, 'utf-8');
            }

            extensions.push({
              id: entry.name,
              ...manifest,
              script: scriptContent,
              path: extPath
            });
          } catch (e) {
            console.error(`Failed to load extension ${entry.name}:`, e);
          }
        }
      }
    }
    return extensions;
  } catch (error) {
    console.error('Error loading extensions:', error);
    return [];
  }
});

ipcMain.handle('openExtensionsFolder', async () => {
    const extensionsPath = path.join(app.getPath('userData'), 'extensions');
    await fs.promises.mkdir(extensionsPath, { recursive: true });
    shell.openPath(extensionsPath);
});

ipcMain.handle('createSampleExtension', async () => {
    const extensionsPath = path.join(app.getPath('userData'), 'extensions');
    const samplePath = path.join(extensionsPath, 'sample-dlc');
    
    try {
        await fs.promises.mkdir(samplePath, { recursive: true });
        
        const manifest = {
            name: "Sample Extension",
            version: "1.0.0",
            description: "A sample extension to demonstrate capabilities",
            main: "index.js"
        };
        
        const script = `
// Sample Extension Script
context.log("Sample Extension Loaded!");

// Example: Create a new plan automatically
// Uncomment to test:
/*
context.api.createPlan({
    title: "Created by DLC",
    description: "This plan was created by an extension!",
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000).toISOString(),
    status: "planning"
}).then(plan => {
    context.showMessage("Successfully created a plan: " + plan.title);
});
*/

// Register an action (can be triggered by future UI updates)
context.registerAction("sayHello", () => {
    context.showMessage("Hello from Sample Extension!");
});
`;

        await fs.promises.writeFile(path.join(samplePath, 'manifest.json'), JSON.stringify(manifest, null, 2));
        await fs.promises.writeFile(path.join(samplePath, 'index.js'), script);
        
        return true;
    } catch (e) {
        console.error("Failed to create sample extension:", e);
        return false;
    }
});

app.whenReady().then(() => {
  createWindow();

  // Function to register global shortcuts
  const registerShortcuts = () => {
    // Unregister all shortcuts first to avoid duplicates
    globalShortcut.unregisterAll();

    // Register F12 to open DevTools
    globalShortcut.register('F12', () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        win.webContents.toggleDevTools();
      }
    });

    // Get settings to find custom shortcut
    const settings = api.getSettings();
    const shortcutKey = settings.globalShortcut || 'Alt+A';

    // Register global shortcut to show/hide window
    try {
      globalShortcut.register(shortcutKey, () => {
        // 如果窗口不存在或已销毁（例如在 macOS 上关闭了窗口），则重新创建
        if (!mainWindow || mainWindow.isDestroyed()) {
          createWindow();
          return;
        }

        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
        mainWindow.focus();
      });
    } catch (e) {
      console.error(`Failed to register shortcut ${shortcutKey}:`, e);
    }
  };

  registerShortcuts();

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
    // Reload shortcuts when settings change
    if (ok) {
      registerShortcuts();
    }
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