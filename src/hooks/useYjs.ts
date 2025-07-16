import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { useState, useEffect, useCallback } from 'react';
import { Awareness } from 'y-protocols/awareness';
import { useOnlineStatus } from './useOnlineStatus';

// Define the exposed electron API on the window object for TypeScript
declare global {
  interface Window {
    ipcRenderer: {
      invoke(channel: string, ...args: any[]): Promise<any>;
      send(channel: string, ...args: any[]): void;
      on(channel: string, listener: (...args: any[]) => void): () => void;
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
  const [isConnected, setIsConnected] = useState(provider?.connected || false);
  // A simple counter to trigger re-renders when the Y.Array changes.
  const [, setVersion] = useState(0);
  const { isOnline } = useOnlineStatus();

  const connectProvider = useCallback(() => {
    if (!provider) {
      provider = new WebrtcProvider('blueprint-plan-sync-room', ydoc, {
        signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com', 'wss://y-webrtc-signaling-us.herokuapp.com']
      });
      awareness = provider.awareness;
      provider.on('status', statusHandler);
    }
    setIsConnected(provider.connected);
  }, []);

  const disconnectProvider = useCallback(() => {
    if (provider) {
      provider.off('status', statusHandler);
      provider.destroy();
      provider = null;
      awareness = null;
    }
    setIsConnected(false);
  }, []);

  const statusHandler = useCallback(({ connected }: { connected: boolean }) => {
    setIsConnected(connected);
  }, []);

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
      const initialState = await window.ipcRenderer.invoke('yjs:get-initial-state');
      Y.applyUpdate(ydoc, new Uint8Array(initialState), 'main');

      if (unmounted) return;

      // 2. Setup the WebRTC provider for P2P communication if online.
      if (isOnline) {
        connectProvider();
      }

      // 3. Listen for local ydoc changes and send them to the main process for persistence.
      const localUpdateHandler = (update: Uint8Array, origin: any) => {
        if (origin !== 'main') { // Don't echo updates that came from the main process.
          window.ipcRenderer.send('yjs:update-from-renderer', update);
        }
      };
      ydoc.on('update', localUpdateHandler);
      
      // 4. Listen for updates from the main process and apply them to the local ydoc.
      const remoteUpdateHandler = (update: Uint8Array) => {
        Y.applyUpdate(ydoc, update, 'main');
      };
      window.ipcRenderer.on('yjs:update-from-main', remoteUpdateHandler);

      // 5. Force re-render on any change to the shared types.
      const rerenderHandler = () => setVersion(v => v + 1);
      const plans = ydoc.getArray('plans');
      plans.observe(rerenderHandler);
    };

    initialize();
    
    return () => {
      unmounted = true;
      if (provider) {
        provider.off('status', statusHandler);
        provider.destroy();
        provider = null;
        awareness = null;
      }
    };
  }, [isOnline, connectProvider, disconnectProvider]); // Re-run when online status changes.

  useEffect(() => {
    if (isOnline) {
      connectProvider();
    } else {
      disconnectProvider();
    }
  }, [isOnline, connectProvider, disconnectProvider]);

  return {
    ydoc,
    plans: ydoc.getArray<Y.Map<any>>('plans'),
    awareness,
    isConnected, // WebRTC provider connection status
  };
}; 