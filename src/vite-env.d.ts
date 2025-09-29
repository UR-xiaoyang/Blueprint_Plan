/// <reference types="vite/client" />

interface Window {
  electron: {
    startServer: (scriptPath: string) => Promise<number>;
    stopServer: (pid: number) => Promise<boolean>;
    isProcessRunning: (pid: number) => Promise<boolean>;
  };
}