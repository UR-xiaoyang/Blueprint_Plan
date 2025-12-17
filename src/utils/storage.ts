import { Plan, Task } from '../App';

const STORAGE_KEY = 'blueprint_plans';

// Helper to generate UUID
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Calculate plan progress
const calculatePlanProgress = (plan: Plan): number => {
  if (!plan.tasks || plan.tasks.length === 0) {
    return 0.0;
  }
  const completedTasks = plan.tasks.filter(task => task.status === "completed").length;
  const progress = (completedTasks / plan.tasks.length) * 100.0;
  return parseFloat(progress.toFixed(1));
};

const getStoredPlans = (): Plan[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load plans from localStorage:', error);
    return [];
  }
};

const savePlans = (plans: Plan[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch (error) {
    console.error('Failed to save plans to localStorage:', error);
  }
};

export const storage = {
  getAllPlans: async (): Promise<Plan[]> => {
    return getStoredPlans();
  },

  createPlan: async (planData: Omit<Plan, 'id' | 'progress' | 'tasks' | 'createdAt' | 'updatedAt'>): Promise<Plan> => {
    const plans = getStoredPlans();
    const newPlan: Plan = {
      ...planData,
      id: generateUUID(),
      progress: 0,
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    plans.push(newPlan);
    savePlans(plans);
    return newPlan;
  },

  updatePlan: async (plan: Plan): Promise<Plan> => {
    const plans = getStoredPlans();
    const index = plans.findIndex(p => p.id === plan.id);
    
    if (index === -1) {
      throw new Error('Plan not found');
    }
    
    const updatedPlan = {
      ...plan,
      updatedAt: new Date().toISOString(),
      progress: calculatePlanProgress(plan)
    };
    
    plans[index] = updatedPlan;
    savePlans(plans);
    return updatedPlan;
  },

  deletePlan: async (planId: string): Promise<void> => {
    const plans = getStoredPlans();
    const filteredPlans = plans.filter(p => p.id !== planId);
    savePlans(filteredPlans);
  },

  createTask: async (planId: string, taskData: Omit<Task, 'id' | 'planId' | 'createdAt' | 'updatedAt'>): Promise<Plan> => {
    const plans = getStoredPlans();
    const planIndex = plans.findIndex(p => p.id === planId);
    
    if (planIndex === -1) {
      throw new Error('Plan not found');
    }
    
    const plan = plans[planIndex];
    const newTask: Task = {
      ...taskData,
      id: generateUUID(),
      planId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!plan.tasks) {
      plan.tasks = [];
    }
    
    plan.tasks.push(newTask);
    plan.progress = calculatePlanProgress(plan);
    plan.updatedAt = new Date().toISOString();
    
    plans[planIndex] = plan;
    savePlans(plans);
    return plan;
  },

  updateTask: async (task: Task): Promise<Plan> => {
    const plans = getStoredPlans();
    const planIndex = plans.findIndex(p => p.id === task.planId);
    
    if (planIndex === -1) {
      throw new Error('Plan not found');
    }
    
    const plan = plans[planIndex];
    if (!plan.tasks) plan.tasks = [];
    
    const taskIndex = plan.tasks.findIndex(t => t.id === task.id);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    
    const updatedTask = {
      ...task,
      updatedAt: new Date().toISOString()
    };
    
    plan.tasks[taskIndex] = updatedTask;
    plan.progress = calculatePlanProgress(plan);
    plan.updatedAt = new Date().toISOString();
    
    plans[planIndex] = plan;
    savePlans(plans);
    return plan;
  },

  deleteTask: async (planId: string, taskId: string): Promise<Plan> => {
    const plans = getStoredPlans();
    const planIndex = plans.findIndex(p => p.id === planId);
    
    if (planIndex === -1) {
      throw new Error('Plan not found');
    }
    
    const plan = plans[planIndex];
    if (!plan.tasks) plan.tasks = [];
    
    plan.tasks = plan.tasks.filter(t => t.id !== taskId);
    plan.progress = calculatePlanProgress(plan);
    plan.updatedAt = new Date().toISOString();
    
    plans[planIndex] = plan;
    savePlans(plans);
    return plan;
  },

  exportData: async (): Promise<void> => {
    // In browser, we can trigger a download
    const plans = getStoredPlans();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plans));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "blueprint_plans_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  },

  importData: async (jsonData: string): Promise<void> => {
    try {
      const importedPlans = JSON.parse(jsonData);
      if (!Array.isArray(importedPlans)) {
        throw new Error('导入的数据必须是一个包含计划的JSON数组。');
      }

      const currentPlans = getStoredPlans();
      
      // Merge strategy: add new plans, replace existing if ID matches? 
      // Or follow backend logic: import as new plans to avoid conflict
      
      const taskPlaceholderId = "请为每个任务提供一个唯一ID，或留空由系统自动生成";

      importedPlans.forEach(planFromFile => {
        const newPlanId = generateUUID();
        
        const tasksWithUniqueIds = (planFromFile.tasks || []).map((task: any) => {
           const isTemplateTask = !task.id || task.id === taskPlaceholderId;
           return {
              ...task,
              id: isTemplateTask ? generateUUID() : task.id,
              planId: newPlanId,
              createdAt: task.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
           };
        });

        const planToSave: Plan = {
          ...planFromFile,
          id: newPlanId,
          tasks: tasksWithUniqueIds,
          createdAt: planFromFile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          progress: planFromFile.progress || 0
        };

        currentPlans.push(planToSave);
      });
      
      savePlans(currentPlans);
    } catch (error: any) {
      console.error('导入数据失败:', error);
      throw new Error('导入数据失败: ' + error.message);
    }
  }
};
