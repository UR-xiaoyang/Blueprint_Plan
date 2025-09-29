/// <reference types="vite/client" />

interface Window {
  electron: {
    startServer: (scriptPath: string) => Promise<{ pid: number; port: number }>;
    stopServer: (pid: number) => Promise<boolean>;
    isProcessRunning: (pid: number) => Promise<boolean>;
    toggleDevTools: (open: boolean) => Promise<void>;
    getServerPort: () => Promise<number | null>;
  };
}