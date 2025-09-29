const { contextBridge, ipcRenderer } = require('electron');

// Whitelist channels for security
const validInvokeChannels = [
  'getAllPlans',
  'saveAllPlans',
  'createPlan',
  'updatePlan',
  'deletePlan',
  'createTask',
  'updateTask',
  'deleteTask',
  'getStatistics',
  'exportData',
  'importData',
  'greet',
  'getSettings', // Added for theme settings
  'saveSettings', // Added for theme settings
  'yjs:get-initial-state',
  'start-server',
  'stop-server',
  'is-process-running', // Added for health check
  'toggle-dev-tools', // Added for debug mode
  'get-server-port', // Added for getting server port
];

const validSendChannels = ['yjs:update-from-renderer'];
const validReceiveChannels = ['yjs:update-from-main'];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    // It's better to throw an error for invalid channels
    throw new Error(`Invalid invoke channel: ${channel}`);
  },
  send: (channel, ...args) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      throw new Error(`Invalid send channel: ${channel}`);
    }
  },
  on: (channel, func) => {
    if (validReceiveChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      
      // Return a cleanup function
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    } else {
      throw new Error(`Invalid receive channel: ${channel}`);
    }
  },
});

contextBridge.exposeInMainWorld('electron', {
  startServer: (scriptPath) => ipcRenderer.invoke('start-server', scriptPath),
  stopServer: (pid) => ipcRenderer.invoke('stop-server', pid),
  isProcessRunning: (pid) => ipcRenderer.invoke('is-process-running', pid), // Added for health check
  toggleDevTools: (open) => ipcRenderer.invoke('toggle-dev-tools', open),
  getServerPort: () => ipcRenderer.invoke('get-server-port'), // Added for getting server port
});
