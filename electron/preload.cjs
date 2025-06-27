const { contextBridge, ipcRenderer } = require('electron');

// Whitelist channels for security
const validInvokeChannels = [
  'get_all_plans',
  'create_plan',
  'update_plan',
  'delete_plan',
  'create_task',
  'update_task',
  'delete_task',
  'get_statistics',
  'export_data',
  'import_data',
  'greet',
  'yjs:get-initial-state',
];

const validSendChannels = ['yjs:update-from-renderer'];
const validReceiveChannels = ['yjs:update-from-main'];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
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
  },
});
