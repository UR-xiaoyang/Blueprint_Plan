/// <reference types="vite/client" />
import 'react';

declare global {
  interface Window {
    electron: {
      toggleDevTools: (open: boolean) => Promise<void>;
      getAppVersion: () => Promise<{ ok: boolean; version?: string; error?: string }>;
    };
    ipcRenderer: {
      invoke(channel: string, ...args: any[]): Promise<any>;
      send(channel: string, ...args: any[]): void;
      on(channel: string, listener: (...args: any[]) => void): () => void;
    };
    appDialog?: {
      alert: (message: string, title?: string) => Promise<void>;
      confirm: (message: string, title?: string) => Promise<boolean>;
    };
  }
}

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}
