import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plan, Task } from '../App';
import { storage } from '../utils/storage';

// 计划统计信息
export interface PlanStats {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}
 // 计划管理器返回值
export interface UsePlanManagerReturn {
  // 状态
  plans: Plan[];
  loading: boolean;
  error: string | null;
  stats: PlanStats;
  
  // 计划操作
  createPlan: (plan: Omit<Plan, 'id' | 'progress' | 'tasks' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePlan: (plan: Plan) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  
  // 任务操作
  createTask: (planId: string, task: Omit<Task, 'id' | 'planId' | 'createdAt' | 'updatedAt' | 'logs'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (planId: string, taskId: string) => Promise<void>;
  addTaskLog: (taskId: string, content: string) => Promise<void>;
  
  // 工具函数
  refreshData: () => Promise<void>;
  exportData: () => Promise<void>;
  importData: (jsonData: string) => Promise<void>;
  
  // 查询函数
  getPlanById: (planId: string) => Plan | undefined;
  getTaskById: (taskId: string) => Task | undefined;
  getTasksByPlan: (planId: string) => Task[];
  getOverdueTasks: () => Task[];
}

export const usePlanManager = (): UsePlanManagerReturn => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (window.ipcRenderer) {
      try {
        const storedPlans = await window.ipcRenderer.invoke('getAllPlans');
        if (Array.isArray(storedPlans)) {
          setPlans(storedPlans);
        } else {
          setPlans([]);
        }
      } catch (err: any) {
        console.error('Failed to load plans:', err);
        setError(err.message || 'Failed to load plans');
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback for non-electron environment (Web/Android)
      try {
        const storedPlans = await storage.getAllPlans();
        setPlans(storedPlans);
      } catch (err: any) {
        console.error('Failed to load plans from storage:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const createPlan = useCallback(async (planData: Omit<Plan, 'id' | 'progress' | 'tasks' | 'createdAt' | 'updatedAt'>) => {
    try {
      let newPlan: Plan;
      if (window.ipcRenderer) {
        // IPC call returns the created plan
        newPlan = await window.ipcRenderer.invoke('createPlan', planData);
      } else {
        // Local storage fallback
        newPlan = await storage.createPlan(planData);
      }
      setPlans(prev => [...prev, newPlan]);
    } catch (err: any) {
      console.error('Failed to create plan:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  const updatePlan = useCallback(async (plan: Plan) => {
    try {
      if (window.ipcRenderer) {
        await window.ipcRenderer.invoke('updatePlan', plan);
      } else {
        await storage.updatePlan(plan);
      }
      setPlans(prev => prev.map(p => p.id === plan.id ? plan : p));
    } catch (err: any) {
      console.error('Failed to update plan:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  const deletePlan = useCallback(async (planId: string) => {
    try {
      if (window.ipcRenderer) {
        await window.ipcRenderer.invoke('deletePlan', planId);
      } else {
        await storage.deletePlan(planId);
      }
      setPlans(prev => prev.filter(p => p.id !== planId));
    } catch (err: any) {
      console.error('Failed to delete plan:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  const createTask = useCallback(async (planId: string, taskData: Omit<Task, 'id' | 'planId' | 'createdAt' | 'updatedAt' | 'logs'>) => {
    try {
      // Add initial log
      const initialLog = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        content: '创建了计划', // As requested by user "创建了计划"
        timestamp: new Date().toISOString()
      };
      
      const taskWithLog = {
        ...taskData,
        logs: [initialLog]
      };

      let updatedPlan: Plan;
      if (window.ipcRenderer) {
        updatedPlan = await window.ipcRenderer.invoke('createTask', planId, taskWithLog);
      } else {
        updatedPlan = await storage.createTask(planId, taskWithLog);
      }
      setPlans(prev => prev.map(p => p.id === planId ? updatedPlan : p));
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  const updateTask = useCallback(async (task: Task) => {
    try {
      let updatedPlan: Plan;
      if (window.ipcRenderer) {
        updatedPlan = await window.ipcRenderer.invoke('updateTask', task);
      } else {
        updatedPlan = await storage.updateTask(task);
      }
      setPlans(prev => prev.map(p => p.id === task.planId ? updatedPlan : p));
    } catch (err: any) {
      console.error('Failed to update task:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (planId: string, taskId: string) => {
    try {
      let updatedPlan: Plan;
      if (window.ipcRenderer) {
        updatedPlan = await window.ipcRenderer.invoke('deleteTask', planId, taskId);
      } else {
        updatedPlan = await storage.deleteTask(planId, taskId);
      }
      setPlans(prev => prev.map(p => p.id === planId ? updatedPlan : p));
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  const addTaskLog = useCallback(async (taskId: string, content: string) => {
    // We need to find the task first to get its planId and current data
    // Since we don't have a direct 'addTaskLog' IPC, we'll update the task
    
    // Find task and plan
    let targetTask: Task | undefined;
    let targetPlanId: string | undefined;
    
    for (const plan of plans) {
      const task = (plan.tasks || []).find(t => t.id === taskId);
      if (task) {
        targetTask = task;
        targetPlanId = plan.id;
        break;
      }
    }
    
    if (!targetTask || !targetPlanId) {
      console.error('Task not found for adding log');
      return;
    }
    
    const newLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      content,
      timestamp: new Date().toISOString()
    };
    
    const updatedTask = {
      ...targetTask,
      logs: [...(targetTask.logs || []), newLog],
      updatedAt: new Date().toISOString()
    };
    
    await updateTask(updatedTask);
  }, [plans, updateTask]);

  const exportData = useCallback(async () => {
    try {
      if (window.ipcRenderer) {
        await window.ipcRenderer.invoke('exportData');
      } else {
        await storage.exportData();
      }
    } catch (err: any) {
      console.error('Failed to export data:', err);
      setError(err.message);
    }
  }, []);

  const importData = useCallback(async (jsonData: string) => {
    try {
      if (window.ipcRenderer) {
        await window.ipcRenderer.invoke('importData', jsonData);
      } else {
        await storage.importData(jsonData);
      }
      await refreshData();
    } catch (err: any) {
      console.error('Failed to import data:', err);
      setError(err.message);
      throw err;
    }
  }, [refreshData]);

  // Getters
  const getPlanById = useCallback((planId: string) => {
    return plans.find(p => p.id === planId);
  }, [plans]);

  const getTaskById = useCallback((taskId: string) => {
    for (const plan of plans) {
      const task = (plan.tasks || []).find(t => t.id === taskId);
      if (task) return task;
    }
    return undefined;
  }, [plans]);

  const getTasksByPlan = useCallback((planId: string) => {
    const plan = plans.find(p => p.id === planId);
    return plan ? (plan.tasks || []) : [];
  }, [plans]);

  const getOverdueTasks = useCallback(() => {
    const now = new Date();
    const overdue: Task[] = [];
    plans.forEach(plan => {
      (plan.tasks || []).forEach(task => {
        if (task.status !== 'completed' && task.dueDate) {
          const dueDate = new Date(task.dueDate);
          if (dueDate < now) {
            overdue.push(task);
          }
        }
      });
    });
    return overdue;
  }, [plans]);

  // Statistics
  const stats = useMemo(() => {
    const totalPlans = plans.length;
    const activePlans = plans.filter(p => p.status === 'in-progress' || p.status === 'planning').length;
    const completedPlans = plans.filter(p => p.status === 'completed').length;
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    plans.forEach(plan => {
      const tasks = plan.tasks || [];
      totalTasks += tasks.length;
      completedTasks += tasks.filter(t => t.status === 'completed').length;
    });
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
      totalPlans,
      activePlans,
      completedPlans,
      totalTasks,
      completedTasks,
      completionRate
    };
  }, [plans]);

  return {
    plans,
    loading,
    error,
    stats,
    createPlan,
    updatePlan,
    deletePlan,
    createTask,
    updateTask,
    deleteTask,
    addTaskLog,
    refreshData,
    exportData,
    importData,
    getPlanById,
    getTaskById,
    getTasksByPlan,
    getOverdueTasks
  };
};