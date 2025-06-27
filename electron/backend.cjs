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

  createPlan: (plan) => {
    const data = loadData();
    plan.id = Date.now().toString();
    plan.createdAt = new Date().toISOString();
    plan.updatedAt = plan.createdAt;
    plan.progress = 0.0;
    plan.tasks = [];
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
    const data = JSON.parse(jsonData);
    saveData(data);
  },

  greet: (name) => {
    return `Hello, ${name}! You've been greeted from Electron!`;
  },
};

module.exports = api;
