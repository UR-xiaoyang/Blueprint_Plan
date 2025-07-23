const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

// Data models (simplified for JavaScript)
class Task {
  constructor(id, title, description, status, priority, planId, startDate, dueDate, createdAt, updatedAt) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.status = status;
    this.priority = priority;
    this.planId = planId;
    this.startDate = startDate;
    this.dueDate = dueDate;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

class Plan {
  constructor(id, title, description, status, progress, startDate, endDate, tasks, createdAt, updatedAt) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.status = status;
    this.progress = progress;
    this.startDate = startDate;
    this.endDate = endDate;
    this.tasks = tasks;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

class AppData {
  constructor() {
    this.plans = [];
    this.settings = {};
  }
}

// Get data file path
function getPlansDir() {
  const userDataPath = app.getPath('userData');
  const appDataDir = path.join(userDataPath, 'app_data');
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
  const plansDir = path.join(appDataDir, 'plans'); // Using a subdirectory for plans
  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, { recursive: true });
  }
  return plansDir;
}

// Helper function to read a single plan from disk
function getPlan(planId) {
  const plansDir = getPlansDir();
  const filePath = path.join(plansDir, `${planId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Failed to read plan ${planId}:`, error);
  }
  return null;
}

// Helper function to save a single plan to disk
function savePlan(plan) {
  const plansDir = getPlansDir();
  const filePath = path.join(plansDir, `${plan.id}.json`);
  const content = JSON.stringify(plan, null, 2);
  fs.writeFileSync(filePath, content, 'utf8');
}

// Calculate plan progress
function calculatePlanProgress(plan) {
  if (plan.tasks.length === 0) {
    return 0.0;
  }
  const completedTasks = plan.tasks.filter(task => task.status === "completed").length;
  return (completedTasks / plan.tasks.length) * 100.0;
}

// API functions (Electron main process will call these)
const api = {
  getAllPlans: () => {
    const plansDir = getPlansDir();
    try {
      const planFiles = fs.readdirSync(plansDir).filter(file => path.extname(file) === '.json');
      const plans = planFiles.map(file => {
        const filePath = path.join(plansDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      });
      return plans;
    } catch (error) {
      console.error('Failed to load plans:', error);
      return [];
    }
  },

  saveAllPlans: (plans) => {
    const plansDir = getPlansDir();
    try {
      console.log('[backend.cjs] saveAllPlans called with:', JSON.stringify(plans, null, 2));
      const existingPlanFiles = fs.readdirSync(plansDir).filter(file => path.extname(file) === '.json');
      const existingPlanIds = new Set(existingPlanFiles.map(file => path.basename(file, '.json')));
      const incomingPlanIds = new Set(plans.map(p => p.id));

      // Delete plans that are no longer present in the incoming array
      for (const planId of existingPlanIds) {
        if (!incomingPlanIds.has(planId)) {
          fs.unlinkSync(path.join(plansDir, `${planId}.json`));
        }
      }

      // Save/update all incoming plans
      for (const plan of plans) {
        if (!plan.id) {
          console.warn('Attempted to save a plan without an ID. Skipping.', plan.title);
          continue;
        }
        savePlan(plan);
      }
      return true;
    } catch (error) {
      console.error('Failed to save all plans:', error);
      return false;
    }
  },

  createPlan: (plan) => {
    try {
      plan.id = randomUUID();
      plan.createdAt = new Date().toISOString();
      plan.updatedAt = plan.createdAt;
      plan.progress = 0.0;
      if (!plan.tasks) {
        plan.tasks = [];
      }
      savePlan(plan);
      return plan;
    } catch (error) {
      console.error('Failed to create plan:', error);
      throw error;
    }
  },

  updatePlan: (plan) => {
    try {
      const plansDir = getPlansDir();
      const filePath = path.join(plansDir, `${plan.id}.json`);
      if (!fs.existsSync(filePath)) {
        throw new Error("Plan not found");
      }
      plan.updatedAt = new Date().toISOString();
      plan.progress = calculatePlanProgress(plan);
      savePlan(plan);
      return plan;
    } catch (error) {
      console.error('Failed to update plan:', error);
      throw error;
    }
  },

  deletePlan: (planId) => {
    try {
      const plansDir = getPlansDir();
      const filePath = path.join(plansDir, `${planId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to delete plan:', error);
      throw error;
    }
  },

  createTask: (planId, task) => {
    const plan = getPlan(planId);
    if (plan) {
      task.id = randomUUID();
      task.planId = planId;
      task.createdAt = new Date().toISOString();
      task.updatedAt = task.createdAt;
      if (!plan.tasks) {
        plan.tasks = [];
      }
      plan.tasks.push(task);
      plan.progress = calculatePlanProgress(plan);
      plan.updatedAt = new Date().toISOString();
      savePlan(plan);
      return task;
    } else {
      throw new Error("Plan not found");
    }
  },

  updateTask: (task) => {
    const plan = getPlan(task.planId);
    if (plan) {
      const existingTaskIndex = plan.tasks.findIndex(t => t.id === task.id);
      if (existingTaskIndex !== -1) {
        task.updatedAt = new Date().toISOString();
        plan.tasks[existingTaskIndex] = task;
        plan.progress = calculatePlanProgress(plan);
        plan.updatedAt = new Date().toISOString();
        savePlan(plan);
        return task;
      } else {
        throw new Error("Task not found");
      }
    } else {
      throw new Error("Plan not found");
    }
  },

  deleteTask: (planId, taskId) => {
    const plan = getPlan(planId);
    if (plan) {
      plan.tasks = plan.tasks.filter(t => t.id !== taskId);
      plan.progress = calculatePlanProgress(plan);
      plan.updatedAt = new Date().toISOString();
      savePlan(plan);
    } else {
      throw new Error("Plan not found");
    }
  },

  getStatistics: () => {
    const plans = api.getAllPlans();
    const stats = {};
    stats.total_plans = plans.length;
    stats.active_plans = plans.filter(p => p.status === "in-progress").length;
    stats.completed_plans = plans.filter(p => p.status === "completed").length;
    stats.total_tasks = plans.reduce((sum, p) => sum + p.tasks.length, 0);
    stats.completed_tasks = plans.reduce((sum, p) => sum + p.tasks.filter(t => t.status === "completed").length, 0);
    return stats;
  },

  exportData: () => {
    const plans = api.getAllPlans();
    return JSON.stringify(plans, null, 2);
  },

  importData: (jsonData) => {
    try {
      console.log('[backend.cjs] importData called with:', jsonData);
      const importedPlans = JSON.parse(jsonData);
      
      if (!Array.isArray(importedPlans)) {
        throw new Error('导入的数据必须是一个包含计划的JSON数组。');
      }
      
      const taskPlaceholderId = "请为每个任务提供一个唯一ID，或留空由系统自动生成";

      importedPlans.forEach(planFromFile => {
        // 核心修改：始终将导入的计划视为一个全新的计划，以防止ID冲突和意外覆盖。
        const newPlanId = randomUUID();
        
        // 为新计划中的所有任务也分配唯一的ID。
        const tasksWithUniqueIds = (planFromFile.tasks || []).map(task => {
           const isTemplateTask = !task.id || task.id === taskPlaceholderId;
           return {
              ...task,
              id: isTemplateTask ? randomUUID() : task.id,
              planId: newPlanId, // 确保任务关联到新的计划ID
              createdAt: task.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
           };
        });

        const planToSave = {
          ...planFromFile,
          id: newPlanId, // 强制使用新生成的UUID作为计划ID
          tasks: tasksWithUniqueIds,
          createdAt: planFromFile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          progress: planFromFile.progress || 0
        };

        savePlan(planToSave);
      });
      
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      throw new Error('导入数据失败: ' + error.message);
    }
  },

  greet: (name) => {
    return `Hello, ${name}! You've been greeted from Electron!`;
  },
};

module.exports = api;
