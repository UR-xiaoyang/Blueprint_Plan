import { storage } from '../utils/storage';
import { Plan, Task } from '../App';

export interface ExtensionManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  main?: string;
}

export interface Extension extends ExtensionManifest {
  id: string;
  script: string;
  path: string;
  enabled?: boolean;
}

export interface ExtensionAPI {
    getAllPlans: () => Promise<Plan[]>;
    createPlan: (data: any) => Promise<Plan>;
    updatePlan: (plan: Plan) => Promise<Plan>;
    deletePlan: (id: string) => Promise<void>;
    createTask: (planId: string, data: any) => Promise<Plan>;
}

export interface ExtensionContext {
  registerAction: (name: string, callback: () => void) => void;
  log: (message: string) => void;
  showMessage: (message: string) => void;
  api: ExtensionAPI;
}

class ExtensionService {
  private extensions: Extension[] = [];
  private loadedExtensions: Map<string, boolean> = new Map();

  async loadExtensions(): Promise<Extension[]> {
    // Check if running in Electron
    if ((window as any).ipcRenderer) {
      try {
        const exts = await (window as any).ipcRenderer.invoke('loadExtensions');
        this.extensions = exts.map((e: any) => ({ ...e, enabled: true }));
        return this.extensions;
      } catch (e) {
        console.error("Failed to load extensions:", e);
        return [];
      }
    } else {
        console.warn("Not running in Electron, extensions disabled.");
        return [];
    }
  }

  async openExtensionsFolder() {
    if ((window as any).ipcRenderer) {
      await (window as any).ipcRenderer.invoke('openExtensionsFolder');
    }
  }

  async createSampleExtension() {
      if ((window as any).ipcRenderer) {
          await (window as any).ipcRenderer.invoke('createSampleExtension');
      }
  }

  runExtension(extension: Extension) {
    if (!extension.script) return;
    if (this.loadedExtensions.has(extension.id)) return;

    const context: ExtensionContext = {
      registerAction: (name, callback) => {
        console.log(`[Extension ${extension.name}] Registered action: ${name}`);
        // Future: Add to a global action registry
      },
      log: (msg) => console.log(`[Extension ${extension.name}] ${msg}`),
      showMessage: (msg) => alert(`[${extension.name}] ${msg}`), // Simple demo interaction
      api: {
          getAllPlans: () => storage.getAllPlans(),
          createPlan: (data) => storage.createPlan(data),
          updatePlan: (plan) => storage.updatePlan(plan),
          deletePlan: (id) => storage.deletePlan(id),
          createTask: (planId, data) => storage.createTask(planId, data)
      }
    };

    try {
      // Wrap in IIFE to avoid global scope pollution if possible, though new Function is already isolated
      const run = new Function('context', `
        try {
            ${extension.script}
        } catch(e) {
            context.log("Error in extension script: " + e.message);
        }
      `);
      run(context);
      this.loadedExtensions.set(extension.id, true);
      console.log(`Extension ${extension.name} loaded.`);
    } catch (e) {
      console.error(`Error running extension ${extension.name}:`, e);
    }
  }


  runAll() {
    this.extensions.forEach(ext => {
      if (ext.enabled) {
        this.runExtension(ext);
      }
    });
  }
}

export const extensionService = new ExtensionService();
