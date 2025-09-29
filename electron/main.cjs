const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const kill = require('tree-kill');

// Set user data path before app is ready to avoid cache issues
const userDataPath = path.join(app.getPath('appData'), 'Blueprint-Plan');
app.setPath('userData', userDataPath);

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

  const loadDevServer = (url, retries = 5) => {
    mainWindow.loadURL(url).catch(err => {
      console.error(`Failed to load dev server at ${url}, retrying... (${retries} left)`);
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
    // Open the DevTools automatically in development mode.
    mainWindow.webContents.openDevTools();
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

  ipcMain.handle('getSettings', async () => {
    return api.getSettings();
  });

  ipcMain.handle('saveSettings', async (event, settings) => {
    return api.saveSettings(settings);
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

  // --- Server Management IPC Handlers ---
  const runningServers = new Map();
  let serverPort = null; // Variable to store the server port

  ipcMain.handle('start-server', (event, scriptPath) => {
    return new Promise((resolve, reject) => {
      // Generate a random port above 10000
      serverPort = Math.floor(Math.random() * 10000) + 10000;

      const serverProcess = fork(
        path.resolve(process.cwd(), 'node_modules/y-webrtc/bin/server.js'),
        ['--host', '127.0.0.1'],
        {
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'], // Redirect stdout and stderr to pipes, and enable IPC
          env: { ...process.env, PORT: serverPort.toString() },
          silent: true // If true, stdin, stdout, and stderr of the child are piped to the parent
        }
      );
    
      serverProcess.stdout.on('data', (data) => {
        console.log(`[Handshake Server]: ${data}`);
      });
    
      serverProcess.stderr.on('data', (data) => {
        console.error(`[Handshake Server ERROR]: ${data}`);
      });
    
      serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
      });
      serverProcess.on('error', (err) => {
        console.error(`Failed to start server ${scriptPath}:`, err);
        reject(err);
      });

      serverProcess.on('spawn', () => {
        if (serverProcess.pid) {
          runningServers.set(serverProcess.pid, serverProcess);
          console.log(`Server started with PID: ${serverProcess.pid} on port ${serverPort}`);
          resolve({ pid: serverProcess.pid, port: serverPort });
        }
      });
    });
  });

  ipcMain.handle('stop-server', async (event, pid) => {
    const serverProcess = runningServers.get(pid);
    if (serverProcess) {
      return new Promise((resolve, reject) => {
        kill(pid, 'SIGKILL', (err) => {
          if (err) {
            console.error(`Failed to kill process tree for PID ${pid}:`, err);
            reject(err);
          } else {
            console.log(`Process tree for PID ${pid} successfully killed.`);
            runningServers.delete(pid);
            serverPort = null; // Reset the port when the server is stopped
            resolve(true);
          }
        });
      });
    } else {
      console.warn(`Server with PID ${pid} not found.`);
      return false;
    }
  });

  // IPC handler to get the current server port
  ipcMain.handle('get-server-port', () => {
    return serverPort;
  });

  ipcMain.handle('is-process-running', (event, pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      return false;
    }
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
