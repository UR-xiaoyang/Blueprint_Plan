import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import "./App.css";
import Dashboard from "./components/Dashboard";
import PlanManager from "./components/PlanManager";
import TaskManager from "./components/TaskManager";
import Sidebar from "./components/Sidebar";
import { NotificationContainer, useNotifications } from "./components/Notification";
import { usePlanManager } from "./hooks/usePlanManager";
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import { useTheme } from './hooks/useTheme';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  planId: string;
  startDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'in-progress' | 'completed' | 'archived';
  progress: number;
  startDate: string;
  endDate: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

type ViewType = 'dashboard' | 'plans' | 'tasks' | 'analytics' | 'settings';

const App: React.FC = memo(() => {
  useTheme(); // Initialize theme
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // 通知系统
  const { notifications, removeNotification } = useNotifications();
  
  // 使用新的Hook管理状态
  const {
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
    refreshData,
    exportData,
    importData
  } = usePlanManager();

  // 检测移动设备
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileView = window.innerWidth <= 768;
      setIsMobile(isMobileView);
      
      // 在移动设备上自动折叠侧边栏
      if (isMobileView && !isSidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };
    
    // 初始检查
    checkIfMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkIfMobile);
    
    // 清理监听器
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, [isSidebarCollapsed]);

  const selectedPlan = useMemo(
    () => plans.find(plan => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
    // 在移动设备上，切换视图后自动折叠侧边栏
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  const handlePlanSelect = useCallback((plan: Plan) => {
    setSelectedPlanId(plan.id);
    setCurrentView('tasks');
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // 缓存计算结果，避免重复计算
  const planStats = useMemo(() => {
    return {
      totalPlans: stats.totalPlans,
      activePlans: stats.activePlans,
      completedPlans: stats.completedPlans,
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      completionRate: stats.completionRate
    };
  }, [stats]);

  // 使用useCallback优化渲染函数
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>正在加载数据...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container">
          <div className="error-message">
            <h3>❌ 出现错误</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={refreshData}>
              重试
            </button>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            plans={plans} 
            onPlanSelect={handlePlanSelect}
            onNavigate={handleViewChange}
          />
        );
      case 'plans':
        return (
          <PlanManager 
            plans={plans} 
            onPlanSelect={handlePlanSelect}
            createPlan={createPlan}
            updatePlan={updatePlan}
            deletePlan={deletePlan}
            exportData={exportData}
            importData={importData}
          />
        );
      case 'tasks':
        return (
          <TaskManager 
            selectedPlan={selectedPlan}
            createTask={createTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
          />
        );
      case 'analytics':
        return <Analytics plans={plans} />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <Dashboard 
            plans={plans} 
            onPlanSelect={handlePlanSelect}
            onNavigate={handleViewChange}
          />
        );
    }
  };

  return (
    <div className={`app ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobile ? 'mobile' : ''}`}>
      <div className="app-content">
        <Sidebar 
          currentView={currentView}
          onViewChange={handleViewChange}
          stats={planStats}
          isCollapsed={isSidebarCollapsed}
          onToggle={handleToggleSidebar}
        />
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
      <NotificationContainer 
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
});

App.displayName = 'App';

export default App;
