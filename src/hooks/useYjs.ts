import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { useState, useEffect, useCallback } from 'react';
import { Awareness } from 'y-protocols/awareness';
import { useOnlineStatus } from './useOnlineStatus';
import { useOnlineMode } from './useOnlineMode';

// Define the exposed electron API on the window object for TypeScript
declare global {
  interface Window {
    ipcRenderer: {
      invoke(channel: string, ...args: any[]): Promise<any>;
      send(channel: string, ...args: any[]): void;
      on(channel: string, listener: (...args: any[]) => void): () => void;
    };
    electron: {
      startServer: (scriptPath: string) => Promise<{ pid: number; port: number }>;
      stopServer: (pid: number) => Promise<boolean>;
      isProcessRunning: (pid: number) => Promise<boolean>;
      toggleDevTools: (open: boolean) => Promise<void>;
      getServerPort: () => Promise<number | null>;
    };
  }
}

// --- Singleton Yjs instance for the entire application ---
// This ensures all components share the same collaborative state.
const ydoc = new Y.Doc();
// We will initialize the provider once we have the data from main.
let provider: WebrtcProvider | null = null;
let awareness: Awareness | null = null;

// Flag to ensure initialization only happens once.
let isInitialized = false;

// --- Custom Hook ---
export const useYjs = () => {
  const [isConnected, setIsConnected] = useState(false);
  // A simple counter to trigger re-renders when the Y.Array changes.
  const [, setVersion] = useState(0);
  const { isOnline } = useOnlineStatus();
  const { onlineMode, serverAddress, localServerStatus } = useOnlineMode();

  const statusHandler = useCallback(({ connected }: { connected: boolean }) => {
    console.log('WebRTC connection status:', connected);
    setIsConnected(connected);
  }, []);

  const disconnectProvider = useCallback(() => {
    if (provider) {
      console.log('Disconnecting from WebRTC provider...');
      provider.off('status', statusHandler);
      provider.destroy();
      provider = null;
      awareness = null;
    }
    setIsConnected(false);
  }, [statusHandler]);

  const connectProvider = useCallback(async () => {
    if (provider) {
      // If a provider exists, we don't need to do anything, unless the config changed.
      // For simplicity, we will rely on the useEffect dependencies to manage this.
      return;
    }

    console.log('Connecting to WebRTC provider...');

    let signalingServers;
    if (onlineMode === 'local') {
      const port = await window.electron.getServerPort();
      if (port) {
        signalingServers = [`ws://127.0.0.1:${port}`];
      } else {
        console.error('Could not get local server port. Aborting connection.');
        return;
      }
    } else {
      signalingServers = serverAddress ? [serverAddress] : [];
    }

    if (!signalingServers || signalingServers.length === 0) {
      console.log('No signaling server configured. Aborting connection.');
      return;
    }

    provider = new WebrtcProvider('blueprint-plan-sync-room', ydoc, {
      signaling: signalingServers
    });
    awareness = provider.awareness;
    provider.on('status', statusHandler);
    setIsConnected(provider.connected);
  }, [onlineMode, serverAddress, statusHandler]);

  useEffect(() => {
    let unmounted = false;
    
    // The main initialization logic.
    const initialize = async () => {
      if (isInitialized) {
        // If already initialized, just ensure the component state is up to date.
        setIsConnected(provider?.connected || false);
        return;
      }
      isInitialized = true;

      // 1. Get initial data from the main process (which loaded it from LevelDB).
      if (window.ipcRenderer) {
        const initialState = await window.ipcRenderer.invoke('yjs:get-initial-state');
        Y.applyUpdate(ydoc, new Uint8Array(initialState), 'main');
      }

      if (unmounted) return;

      // 2. Listen for local ydoc changes and send them to the main process for persistence.
      const localUpdateHandler = (update: Uint8Array, origin: any) => {
        if (origin !== 'main' && window.ipcRenderer) { // Don't echo updates that came from the main process.
          window.ipcRenderer.send('yjs:update-from-renderer', update);
        }
      };
      ydoc.on('update', localUpdateHandler);
      
      // 3. Listen for updates from the main process and apply them to the local ydoc.
      if (window.ipcRenderer) {
        const remoteUpdateHandler = (update: Uint8Array) => {
          Y.applyUpdate(ydoc, update, 'main');
        };
        window.ipcRenderer.on('yjs:update-from-main', remoteUpdateHandler);
      }

      // 4. Force re-render on any change to the shared types.
      const rerenderHandler = () => setVersion(v => v + 1);
      const plans = ydoc.getArray('plans');
      plans.observe(rerenderHandler);
    };

    initialize();
    
    return () => {
      unmounted = true;
    };
  }, []); // This useEffect should only run once.


  useEffect(() => {
    const shouldConnect = isOnline && (onlineMode === 'cloud' || (onlineMode === 'local' && localServerStatus === 'running'));

    if (shouldConnect) {
      // The connectProvider is memoized and will only create a provider if one doesn't exist.
      // If the connection parameters change, the old provider is disconnected by the cleanup function
      // of the previous effect run, so a new one can be created here.
      connectProvider();
    } else {
      // If we should not be connected, ensure we disconnect.
      disconnectProvider();
    }

    // This cleanup function runs when the dependencies change, or when the component unmounts.
    return () => {
      // When the dependencies change (e.g., onlineMode), we need to disconnect the old provider
      // so that the next effect run can create a new one with the new settings.
      disconnectProvider();
    };
  }, [isOnline, onlineMode, localServerStatus, serverAddress, connectProvider, disconnectProvider]);


  return {
    ydoc,
    plans: ydoc.getArray<Y.Map<any>>('plans'),
    awareness,
    isConnected,
  };
};