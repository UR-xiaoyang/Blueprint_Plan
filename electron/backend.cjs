const { app } = require('electron');
const path = require('path');
const fs = require('fs');

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
function getDataPath() {
  const userDataPath = app.getPath('userData');
  const appDataDir = path.join(userDataPath, 'app_data'); // Using a subdirectory for clarity
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
  return path.join(appDataDir, 'data.json');
}

// Load data
function loadData() {
  const dataPath = getDataPath();
  if (!fs.existsSync(dataPath)) {
    return new AppData();
  }
  const content = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(content);
}

// Save data
function saveData(data) {
  const dataPath = getDataPath();
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(dataPath, content, 'utf8');
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
    const data = loadData();
    return data.plans;
  },

  saveAllPlans: (plans) => {
    const data = loadData();
    data.plans = plans;
    saveData(data);
    return true;
  },

  createPlan: (plan) => {
    const data = loadData();
    plan.id = Date.now().toString();
    plan.createdAt = new Date().toISOString();
    plan.updatedAt = plan.createdAt;
    plan.progress = 0.0;
    // 如果没有提供任务，则初始化为空数组
    if (!plan.tasks) {
    plan.tasks = [];
    }
    data.plans.push(plan);
    saveData(data);
    return plan;
  },

  updatePlan: (plan) => {
    const data = loadData();
    const existingPlanIndex = data.plans.findIndex(p => p.id === plan.id);
    if (existingPlanIndex !== -1) {
      plan.updatedAt = new Date().toISOString();
      plan.progress = calculatePlanProgress(plan);
      data.plans[existingPlanIndex] = plan;
      saveData(data);
      return plan;
    } else {
      throw new Error("Plan not found");
    }
  },

  deletePlan: (planId) => {
    const data = loadData();
    data.plans = data.plans.filter(p => p.id !== planId);
    saveData(data);
  },

  createTask: (planId, task) => {
    const data = loadData();
    const plan = data.plans.find(p => p.id === planId);
    if (plan) {
      task.id = Date.now().toString();
      task.planId = planId;
      task.createdAt = new Date().toISOString();
      task.updatedAt = task.createdAt;
      plan.tasks.push(task);
      plan.progress = calculatePlanProgress(plan);
      plan.updatedAt = new Date().toISOString();
      saveData(data);
      return task;
    } else {
      throw new Error("Plan not found");
    }
  },

  updateTask: (task) => {
    const data = loadData();
    const plan = data.plans.find(p => p.id === task.planId);
    if (plan) {
      const existingTaskIndex = plan.tasks.findIndex(t => t.id === task.id);
      if (existingTaskIndex !== -1) {
        task.updatedAt = new Date().toISOString();
        plan.tasks[existingTaskIndex] = task;
        plan.progress = calculatePlanProgress(plan);
        plan.updatedAt = new Date().toISOString();
        saveData(data);
        return task;
      } else {
        throw new Error("Task not found");
      }
    } else {
      throw new Error("Plan not found");
    }
  },

  deleteTask: (planId, taskId) => {
    const data = loadData();
    const plan = data.plans.find(p => p.id === planId);
    if (plan) {
      plan.tasks = plan.tasks.filter(t => t.id !== taskId);
      plan.progress = calculatePlanProgress(plan);
      plan.updatedAt = new Date().toISOString();
      saveData(data);
    } else {
      throw new Error("Plan not found");
    }
  },

  getStatistics: () => {
    const data = loadData();
    const stats = {};
    stats.total_plans = data.plans.length;
    stats.active_plans = data.plans.filter(p => p.status === "in-progress").length;
    stats.completed_plans = data.plans.filter(p => p.status === "completed").length;
    stats.total_tasks = data.plans.reduce((sum, p) => sum + p.tasks.length, 0);
    stats.completed_tasks = data.plans.reduce((sum, p) => sum + p.tasks.filter(t => t.status === "completed").length, 0);
    return stats;
  },

  exportData: () => {
    const data = loadData();
    return JSON.stringify(data, null, 2);
  },

  importData: (jsonData) => {
    try {
      const data = loadData();
      const newPlans = JSON.parse(jsonData);
      
      if (!Array.isArray(newPlans)) {
        throw new Error('导入的数据必须是一个包含计划的JSON数组。');
      }
      
      const planPlaceholderId = "请为每个计划提供一个唯一ID，或留空由系统自动生成";
      const taskPlaceholderId = "请为每个任务提供一个唯一ID，或留空由系统自动生成";

      newPlans.forEach(newPlan => {
        // 如果计划ID为空或是占位符，则始终视为新计划
        const isTemplatePlan = !newPlan.id || newPlan.id === planPlaceholderId;
        const existingPlanIndex = isTemplatePlan ? -1 : data.plans.findIndex(p => p.id === newPlan.id);

        if (existingPlanIndex !== -1) {
          // 更新现有计划
          data.plans[existingPlanIndex] = {
            ...data.plans[existingPlanIndex],
            ...newPlan,
            updatedAt: new Date().toISOString()
          };
        } else {
          // 添加新计划
          const newPlanId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
          
          // 确保新计划内的任务也获得唯一的ID
          const tasksWithUniqueIds = (newPlan.tasks || []).map(task => {
             const isTemplateTask = !task.id || task.id === taskPlaceholderId;
             return {
                ...task,
                id: isTemplateTask ? Date.now().toString() + Math.random().toString(36).substring(2, 9) : task.id,
                planId: newPlanId, // 关联到新的计划ID
                createdAt: task.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
             };
          });

          data.plans.push({
            ...newPlan,
            id: newPlanId,
            tasks: tasksWithUniqueIds,
            createdAt: newPlan.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: newPlan.progress || 0
          });
        }
      });
      
        saveData(data);
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
