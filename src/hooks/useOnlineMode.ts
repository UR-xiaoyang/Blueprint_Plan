import { create } from 'zustand';

type OnlineModeState = {
  onlineMode: 'local' | 'cloud' | 'offline';
  serverAddress: string;
  localServerStatus: 'running' | 'stopped';
  localServerPid: number | null;
  setOnlineMode: (mode: 'local' | 'cloud' | 'offline') => void;
  setServerAddress: (address: string) => void;
  startLocalServer: () => void;
  stopLocalServer: () => void;
};

let healthCheckInterval: NodeJS.Timeout | null = null;

export const useOnlineMode = create<OnlineModeState>((set, get) => ({
  onlineMode: 'cloud',
  serverAddress: '',
  localServerStatus: 'stopped',
  localServerPid: null,
  setOnlineMode: (mode) => set({ onlineMode: mode }),
  setServerAddress: (address) => set({ serverAddress: address }),
  startLocalServer: async () => {
    if (get().localServerStatus === 'running' || typeof window.electron === 'undefined') {
      return;
    }
    try {
      const { pid } = await window.electron.startServer('p2p-backend.cjs');
      set({ localServerStatus: 'running', localServerPid: pid });

      // Start health check
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      healthCheckInterval = setInterval(async () => {
        const { localServerPid } = get();
        if (localServerPid !== null && typeof window.electron?.isProcessRunning === 'function') {
          const isRunning = await window.electron.isProcessRunning(localServerPid);
          if (!isRunning) {
            set({ localServerStatus: 'stopped', localServerPid: null });
            if (healthCheckInterval) clearInterval(healthCheckInterval);
          }
        }
      }, 5000); // Check every 5 seconds
    } catch (error) {
      console.error('Failed to start local server:', error);
    }
  },
  stopLocalServer: async () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }

    const { localServerPid } = get();
    if (localServerPid === null || typeof window.electron?.stopServer !== 'function') {
      return;
    }
    
    // Immediately update the state to 'stopped'
    set({ localServerStatus: 'stopped', localServerPid: null });

    try {
      await window.electron.stopServer(localServerPid);
      // The state is already updated, so no need to set it again here.
    } catch (error) {
      console.error('Failed to stop local server:', error);
      // If stopping fails, we might need to reconsider the state, but for now, we assume it's stopped.
    }
  },
}));