import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import "./styles/variables.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/sidebar.css";
import "./styles/responsive.css";
import "./styles/dashboard.css";
import "./styles/animations.css";
import Dashboard from "./components/Dashboard";
import PlanManager from "./components/PlanManager";
import TaskManager from "./components/TaskManager";
import Sidebar from "./components/Sidebar";
import TitleBar from "./components/TitleBar";
import { NotificationContainer, useNotifications } from "./components/Notification";
import { usePlanManager } from "./hooks/usePlanManager";
import Settings from './components/Settings';
import { useTheme } from './hooks/useTheme';
import { useDebugMode } from './hooks/useDebugMode';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export interface TaskLog {
  id: string;
  content: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  planId: string;
  startDate: string;
  dueDate: string;
  logs: TaskLog[];
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

type ViewType = 'dashboard' | 'plans' | 'tasks' | 'settings';

const App: React.FC = memo(() => {
  const { themeMode } = useTheme(); // Initialize theme
  const { debugMode } = useDebugMode();

  // Set StatusBar style for mobile - Force Black Background
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const applyStatusBarStyle = async () => {
        try {
          // 强制设置样式为 Dark (文字变白)，背景为黑色
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#000000' });
          await StatusBar.setOverlaysWebView({ overlay: false });
        } catch (e) {
          console.error('Failed to set status bar style', e);
        }
      };

      // 初始设置
      applyStatusBarStyle();

      // 监听应用恢复状态，防止从后台回来变色
      // 同时也作为一种保障，在任何可能的重绘后再次应用
      const resumeListener = async () => {
         // 稍微延迟以确保在系统UI更新后执行
         setTimeout(applyStatusBarStyle, 200);
      };
      
      // 添加监听器 (需要引入 App 插件，但暂时我们可以利用简单的 interval 或 React 生命周期)
      // 由于没有引入 @capacitor/app，我们先依赖 themeMode 的变化来触发重置
      
      return () => {
        // cleanup if needed
      };
    }
  }, [themeMode]); // 添加 themeMode 依赖，确保主题切换时始终保持黑色状态栏

  // Toggle debug class on body
  useEffect(() => {
    if (debugMode) {
      document.body.classList.add('debug-mode');
    } else {
      document.body.classList.remove('debug-mode');
    }
  }, [debugMode]);

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // 状态栏高度占位符（仅用于 Android）
  // 在某些 Android 版本中，状态栏可能会覆盖内容，我们需要一个显式的占位符
  const [showStatusBarSpacer, setShowStatusBarSpacer] = useState(false);
  
  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      setShowStatusBarSpacer(true);
    }
  }, []);
  
  // 通知系统
  const { notifications, removeNotification } = useNotifications();

  // 使用新的Hook管理状态
  const {
    plans,
    loading,
    error,
    createPlan,
    updatePlan,
    deletePlan,
    createTask,
    updateTask,
    deleteTask,
    addTaskLog,
    refreshData,
    exportData,
    importData
  } = usePlanManager();

  // 检测移动设备
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileView = window.innerWidth <= 768;
      setIsMobile(isMobileView);
    };
    
    // 初始检查
    checkIfMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkIfMobile);
    
    // 清理监听器
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  const selectedPlan = useMemo(
    () => plans.find(plan => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  const handlePlanSelect = useCallback((plan: Plan) => {
    setSelectedPlanId(plan.id);
    setCurrentView('tasks');
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

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
            addTaskLog={addTaskLog}
          />
        );
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

  const viewTitles: Record<ViewType, string> = useMemo(() => ({
    'dashboard': '仪表盘',
    'plans': '计划管理',
    'tasks': '任务',
    'settings': '设置'
  }), []);

  return (
    <div className={`app ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobile ? 'mobile' : ''}`}>
      {/* Android 状态栏显式占位符 */}
      {showStatusBarSpacer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          // 优先使用 env 变量，如果没有则使用 36px 兜底
          height: 'max(env(safe-area-inset-top), 36px)',
          backgroundColor: '#000000',
          zIndex: 99999,
          pointerEvents: 'none' // 允许点击穿透（虽然在这个位置通常不需要）
        }} />
      )}
      
      {/* 如果显示了占位符，我们需要为内容添加顶部内边距，以防止被占位符遮挡 */}
      <style>{`
        .app {
          /* 如果是 Android，添加额外的 padding-top 来适应这个占位符 */
          ${showStatusBarSpacer ? 'padding-top: max(env(safe-area-inset-top), 36px) !important;' : ''}
        }
      `}</style>

      {!isMobile && <TitleBar title={viewTitles[currentView]} />}
      <div className="app-content">
        <Sidebar 
          currentView={currentView}
          onViewChange={handleViewChange}
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