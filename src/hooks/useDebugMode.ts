import { create } from 'zustand';

type DebugModeState = {
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
};

export const useDebugMode = create<DebugModeState>((set) => ({
  debugMode: false,
  setDebugMode: (enabled) => {
    set({ debugMode: enabled });
    if (window.electron) {
      window.electron.toggleDevTools(enabled);
    }
  },
}));