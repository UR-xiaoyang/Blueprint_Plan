import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Y from 'yjs';
import { Plan, Task } from '../App';
import { useYjs } from './useYjs';

// 为 window.ipcRenderer 添加类型定义
declare global {
  interface Window {
    ipcRenderer: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

export interface PlanStats {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

export interface UsePlanManagerReturn {
  // 状态
  plans: Plan[];
  loading: boolean;
  error: string | null;
  stats: PlanStats;
  isConnected: boolean;
  
  // 计划操作
  createPlan: (plan: Omit<Plan, 'id' | 'progress' | 'tasks' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePlan: (plan: Plan) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  
  // 任务操作
  createTask: (planId: string, task: Omit<Task, 'id' | 'planId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (planId: string, taskId: string) => Promise<void>;
  
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
  const { ydoc, plans: yPlans, isConnected } = useYjs();
  const [managedPlans, setManagedPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Utility to convert Y.Map to plain JS object
  const ymapToJs = (ymap: Y.Map<any>): any => {
    return ymap.toJSON();
  };

  // Debounce function
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
      new Promise(resolve => {
        clearTimeout(timeout);
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
  };

  // Debounced save function
  const debouncedSave = useCallback(
    debounce((plansToSave: Plan[]) => {
      if (window.ipcRenderer) {
        window.ipcRenderer.invoke('saveAllPlans', plansToSave);
      }
    }, 1000),
    []
  );

  useEffect(() => {
    const syncPlans = () => {
      const plans = yPlans.toArray().map(p => ymapToJs(p) as Plan);
      setManagedPlans(plans);
      debouncedSave(plans);
    };

    yPlans.observeDeep(syncPlans);

    // Initial sync in case there's data from another source already in ydoc
    syncPlans();

    return () => {
      yPlans.unobserveDeep(syncPlans);
    };
  }, [yPlans, debouncedSave]);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      if (window.ipcRenderer) {
        try {
          const storedPlans = await window.ipcRenderer.invoke('getAllPlans');
          if (storedPlans && storedPlans.length > 0) {
            ydoc.transact(() => {
              const yPlansArray = storedPlans.map((plan: Plan) => {
                const planMap = new Y.Map();
                for (const key in plan) {
                  if (key === 'tasks') {
                    const yTasks = new Y.Array();
                    plan.tasks.forEach(task => {
                      const taskMap = new Y.Map();
                      for (const taskKey in task) {
                        taskMap.set(taskKey, task[taskKey as keyof Task]);
                      }
                      yTasks.push([taskMap]);
                    });
                    planMap.set(key, yTasks);
                  } else {
                    planMap.set(key, plan[key as keyof Plan]);
                  }
                }
                return planMap;
              });
              // Clear existing and push new ones
              yPlans.delete(0, yPlans.length);
              yPlans.push(yPlansArray);
            });
          }
        } catch (e) {
          setError('Failed to load data');
          console.error(e);
        }
      }
      setLoading(false);
    };

    loadInitialData();
  }, [ydoc, yPlans]);

  const yjsToPlan = (planMap: Y.Map<any>): Plan => {
    const plan: any = {};
    planMap.forEach((value, key) => {
      if (key === 'tasks') {
        plan[key] = (value as Y.Array<Y.Map<any>>).toArray().map(ymapToJs);
      } else {
        plan[key] = value;
      }
    });
    return plan as Plan;
  };

  const stats: PlanStats = useMemo(() => {
    const totalTasks = managedPlans.reduce((sum, plan) => sum + plan.tasks.length, 0);
    const completedTasks = managedPlans.reduce(
      (sum, plan) => sum + plan.tasks.filter(task => task.status === 'completed').length,
      0
    );
    return {
      totalPlans: managedPlans.length,
      activePlans: managedPlans.filter(p => p.status === 'in-progress').length,
      completedPlans: managedPlans.filter(p => p.status === 'completed').length,
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    };
  }, [managedPlans]);

  // 刷新数据
  const refreshData = useCallback(async () => {
    // This function can now be simpler, or be removed if not needed,
    // as data is loaded on startup and syncs automatically.
    // For now, let's make it re-trigger the initial load logic.
    const load = async () => {
      if (window.ipcRenderer) {
        const storedPlans = await window.ipcRenderer.invoke('getAllPlans');
        if (storedPlans && storedPlans.length > 0) {
           ydoc.transact(() => {
              const yPlansArray = storedPlans.map((plan: Plan) => {
                const planMap = new Y.Map();
                for (const key in plan) {
                  if (key === 'tasks') {
                    const yTasks = new Y.Array();
                    plan.tasks.forEach(task => {
                      const taskMap = new Y.Map();
                      for (const taskKey in task) {
                        taskMap.set(taskKey, task[taskKey as keyof Task]);
                      }
                      yTasks.push([taskMap]);
                    });
                    planMap.set(key, yTasks);
                  } else {
                    planMap.set(key, plan[key as keyof Plan]);
                  }
                }
                return planMap;
              });
              // Clear existing and push new ones
              yPlans.delete(0, yPlans.length);
              yPlans.push(yPlansArray);
            });
        }
      }
    };
    load();
  }, [ydoc, yPlans]);

  // 创建计划
  const createPlan = useCallback(async (planData: Omit<Plan, 'id' | 'progress' | 'tasks' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      const planMap = new Y.Map();
      const newId = Date.now().toString();
      
      planMap.set('id', newId);
      planMap.set('title', planData.title);
      planMap.set('description', planData.description);
      planMap.set('status', planData.status || 'pending');
      planMap.set('startDate', planData.startDate);
      planMap.set('endDate', planData.endDate);
      planMap.set('progress', 0);
      planMap.set('tasks', new Y.Array<Task>());
      planMap.set('createdAt', new Date().toISOString());
      planMap.set('updatedAt', new Date().toISOString());
      
      ydoc.transact(() => {
        yPlans.push([planMap]);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建计划失败');
      throw err;
    }
  }, [ydoc, yPlans]);

  // 更新计划
  const updatePlan = useCallback(async (plan: Plan) => {
    try {
      setError(null);
      const planIndex = yPlans.toArray().findIndex(p => p.get('id') === plan.id);
      if (planIndex === -1) throw new Error('Plan not found');
      
      const planMap = yPlans.get(planIndex);
      ydoc.transact(() => {
        planMap.set('title', plan.title);
        planMap.set('description', plan.description);
        planMap.set('status', plan.status);
        planMap.set('updatedAt', new Date().toISOString());
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新计划失败');
      throw err;
    }
  }, [ydoc, yPlans]);

  // 删除计划
  const deletePlan = useCallback(async (planId: string) => {
    try {
      setError(null);
      const planIndex = yPlans.toArray().findIndex(p => p.get('id') === planId);
      if (planIndex > -1) {
        ydoc.transact(() => {
          yPlans.delete(planIndex, 1);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除计划失败');
      throw err;
    }
  }, [ydoc, yPlans]);

  // 创建任务
  const createTask = useCallback(async (planId: string, taskData: Omit<Task, 'id' | 'planId' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      const planIndex = yPlans.toArray().findIndex(p => p.get('id') === planId);
      if (planIndex === -1) throw new Error('Plan not found');
      
      const planMap = yPlans.get(planIndex);
      const tasksArray = planMap.get('tasks') as Y.Array<Y.Map<any>>;
      
      const taskMap = new Y.Map();
      taskMap.set('id', new Date().getTime().toString());
      taskMap.set('planId', planId);
      taskMap.set('title', taskData.title);
      taskMap.set('description', taskData.description);
      taskMap.set('status', taskData.status || 'pending');
      taskMap.set('priority', taskData.priority);
      taskMap.set('startDate', taskData.startDate);
      taskMap.set('dueDate', taskData.dueDate);
      taskMap.set('createdAt', new Date().toISOString());
      taskMap.set('updatedAt', new Date().toISOString());

      ydoc.transact(() => {
        tasksArray.push([taskMap]);
        planMap.set('updatedAt', new Date().toISOString());
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建任务失败');
      throw err;
    }
  }, [ydoc, yPlans]);

  // 更新任务
  const updateTask = useCallback(async (task: Task) => {
    try {
      setError(null);
      const planIndex = yPlans.toArray().findIndex(p => p.get('id') === task.planId);
      if (planIndex === -1) throw new Error('Plan not found');
      
      const planMap = yPlans.get(planIndex);
      const tasksArray = planMap.get('tasks') as Y.Array<Y.Map<any>>;
      const taskIndex = tasksArray.toArray().findIndex(t => t.get('id') === task.id);
      if (taskIndex === -1) throw new Error('Task not found');
      
      const taskMap = tasksArray.get(taskIndex);
      ydoc.transact(() => {
        taskMap.set('title', task.title);
        taskMap.set('description', task.description);
        taskMap.set('status', task.status);
        taskMap.set('dueDate', task.dueDate);
        taskMap.set('priority', task.priority);
        taskMap.set('updatedAt', new Date().toISOString());
        planMap.set('updatedAt', new Date().toISOString());
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新任务失败');
      throw err;
    }
  }, [ydoc, yPlans]);

  // 删除任务
  const deleteTask = useCallback(async (planId: string, taskId: string) => {
    try {
      setError(null);
      const planIndex = yPlans.toArray().findIndex(p => p.get('id') === planId);
      if (planIndex === -1) throw new Error('Plan not found');
      
      const planMap = yPlans.get(planIndex);
      const tasksArray = planMap.get('tasks') as Y.Array<Y.Map<any>>;
      const taskIndex = tasksArray.toArray().findIndex(t => t.get('id') === taskId);
      if (taskIndex === -1) throw new Error('Task not found');
      
      ydoc.transact(() => {
        tasksArray.delete(taskIndex, 1);
        planMap.set('updatedAt', new Date().toISOString());
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除任务失败');
      throw err;
    }
  }, [ydoc, yPlans]);

  // 导出数据
  const exportData = useCallback(async () => {
    try {
      setError(null);
      const jsonData = JSON.stringify(managedPlans, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `blueprint-plan-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出数据失败');
      throw err;
    }
  }, [managedPlans]);

  // 导入数据
  const importData = useCallback(async (jsonData: string) => {
    try {
      setError(null);
      const data = JSON.parse(jsonData) as Plan[];
      // Caution: This is a destructive import. It clears existing data.
      ydoc.transact(() => {
        yPlans.delete(0, yPlans.length);
        const newYPlans = data.map(plan => {
          const planMap = new Y.Map();
          for (const key in plan) {
            if (key === 'tasks') {
              const yTasks = new Y.Array();
              const tasks = (plan[key] as unknown as Task[]).map(task => {
                const taskMap = new Y.Map();
                for (const tKey in task) {
                  taskMap.set(tKey, task[tKey as keyof Task]);
                }
                return taskMap;
              });
              yTasks.push(tasks);
              planMap.set(key, yTasks);
            } else {
              planMap.set(key, plan[key as keyof Plan]);
            }
          }
          return planMap;
        });
        yPlans.push(newYPlans);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入数据失败');
      throw err;
    }
  }, [ydoc, yPlans]);

  // 查询函数
  const getPlanById = useCallback((planId: string): Plan | undefined => {
    return managedPlans.find(plan => plan.id === planId);
  }, [managedPlans]);

  const getTaskById = useCallback((taskId: string): Task | undefined => {
    for (const plan of managedPlans) {
      const task = plan.tasks.find(task => task.id === taskId);
      if (task) return task;
    }
    return undefined;
  }, [managedPlans]);

  const getTasksByPlan = useCallback((planId: string): Task[] => {
    const plan = managedPlans.find(p => p.id === planId);
    return plan ? plan.tasks : [];
  }, [managedPlans]);

  const getOverdueTasks = useCallback((): Task[] => {
    const now = new Date();
    const overdueTasks: Task[] = [];
    
    for (const plan of managedPlans) {
      for (const task of plan.tasks) {
        if (task.status !== 'completed' && new Date(task.dueDate) < now) {
          overdueTasks.push(task);
        }
      }
    }
    
    return overdueTasks;
  }, [managedPlans]);

  return {
    plans: managedPlans,
    loading,
    error,
    stats,
    isConnected,
    createPlan,
    updatePlan,
    deletePlan,
    createTask,
    updateTask,
    deleteTask,
    refreshData,
    exportData,
    importData,
    getPlanById,
    getTaskById,
    getTasksByPlan,
    getOverdueTasks
  };
}; 