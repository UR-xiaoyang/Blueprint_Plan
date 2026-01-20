import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import "./styles/variables.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/sidebar.css";
import "./styles/responsive.css";
import "./styles/dashboard.css";
import "./styles/settings.css";
import "./styles/animations.css";
import Dashboard from "./components/Dashboard";
import PlanManager from "./components/PlanManager";
import TaskManager from "./components/TaskManager";
import AIPlanView from "./components/AIPlanView";
import Sidebar from "./components/Sidebar";
import TitleBar from "./components/TitleBar";
import { NotificationContainer, useNotifications } from "./components/Notification";
import { usePlanManager } from "./hooks/usePlanManager";
import Settings from './components/Settings';
import ExtensionsView from './components/ExtensionsView';
import { extensionService } from './services/extensionService';
import { useTheme } from './hooks/useTheme';
import { useDebugMode } from './hooks/useDebugMode';
import { ViewType } from './types';

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


const App: React.FC = memo(() => {
  const { themeMode } = useTheme(); // Initialize theme
  const { debugMode } = useDebugMode();
  const [showExtensions, setShowExtensions] = useState(false);
  const [dialogState, setDialogState] = useState<{
    type: 'alert' | 'confirm';
    title?: string;
    message: string;
  } | null>(null);
  const dialogResolveRef = useRef<null | ((value: boolean) => void)>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  // Toggle debug class on body
  useEffect(() => {
    if (debugMode) {
      document.body.classList.add('debug-mode');
    } else {
      document.body.classList.remove('debug-mode');
    }
  }, [debugMode]);

  // Initialize extensions
  useEffect(() => {
    const initExtensions = async () => {
        try {
            await extensionService.loadExtensions();
            extensionService.runAll();
        } catch (e) {
            console.error("Failed to initialize extensions:", e);
        }
    };
    initExtensions();
  }, []);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const editable = target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"]') as HTMLElement | null;
      if (!editable) return;

      try {
        window.focus();
      } catch (_) {}

      requestAnimationFrame(() => {
        try {
          editable.focus();
        } catch (_) {}
      });
    };

    document.addEventListener('pointerdown', handler, true);
    return () => {
      document.removeEventListener('pointerdown', handler, true);
    };
  }, []);

  useEffect(() => {
    const alertFn = async (message: string, title?: string) => {
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      lastActiveElementRef.current = active;
      return await new Promise<void>((resolve) => {
        dialogResolveRef.current = () => {
          resolve();
        };
        setDialogState({ type: 'alert', title, message });
      });
    };

    const confirmFn = async (message: string, title?: string) => {
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      lastActiveElementRef.current = active;
      return await new Promise<boolean>((resolve) => {
        dialogResolveRef.current = (v: boolean) => {
          resolve(v);
        };
        setDialogState({ type: 'confirm', title, message });
      });
    };

    window.appDialog = { alert: alertFn, confirm: confirmFn };
    return () => {
      if (window.appDialog?.alert === alertFn && window.appDialog?.confirm === confirmFn) {
        delete window.appDialog;
      }
    };
  }, []);

  const closeDialog = useCallback((result: boolean) => {
    const resolve = dialogResolveRef.current;
    setDialogState(null);
    dialogResolveRef.current = null;
    if (resolve) {
      resolve(result);
    }

    requestAnimationFrame(() => {
      try {
        window.focus();
      } catch (_) {}
      const el = lastActiveElementRef.current;
      if (el && document.contains(el)) {
        try {
          el.focus();
        } catch (_) {}
      }
      lastActiveElementRef.current = null;
    });
  }, []);

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [modifyingPlanId, setModifyingPlanId] = useState<string | null>(null);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  
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

  const modifyingPlan = useMemo(
    () => plans.find(plan => plan.id === modifyingPlanId) ?? null,
    [plans, modifyingPlanId]
  );

  const handleViewChange = useCallback((view: ViewType) => {
    // 切换页面时清除当前焦点，防止焦点卡死在之前的输入框上
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setCurrentView(view);
    if (view !== 'ai-planning') {
      setModifyingPlanId(null);
    }
  }, []);

  const handlePlanSelect = useCallback((plan: Plan) => {
    setSelectedPlanId(plan.id);
    setCurrentView('tasks');
  }, []);

  const handleModifyWithAI = useCallback((plan: Plan) => {
    setModifyingPlanId(plan.id);
    setCurrentView('ai-planning');
  }, []);

  const handleAIPlanGenerated = useCallback(async (planData: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'progress'>) => {
    try {
      if (importData) {
         const planForImport = {
            ...planData,
            id: "ai-generated-" + Date.now(), // Temporary ID, importData will generate new UUID
            tasks: planData.tasks.map(t => ({
               ...t,
               id: "ai-task-" + Math.random(), // Temp ID
               planId: "temp"
            }))
         };
         
         await importData(JSON.stringify([planForImport]));
         // 跳转到计划管理查看
         setCurrentView('plans');
      } else {
         if (window.appDialog) {
           await window.appDialog.alert("无法保存计划：导入功能不可用。");
         }
      }
    } catch (error) {
      console.error('保存 AI 计划失败:', error);
      if (window.appDialog) {
        await window.appDialog.alert('保存计划失败');
      }
    }
  }, [importData]);

  const handleAIPlanUpdated = useCallback(async (updatedPlan: Plan) => {
    try {
      await updatePlan(updatedPlan);
      setModifyingPlanId(null);
      setCurrentView('plans');
    } catch (error) {
      console.error('更新计划失败:', error);
      if (window.appDialog) {
        await window.appDialog.alert('更新计划失败');
      }
    }
  }, [updatePlan]);

  const handleAICancel = useCallback(() => {
    setModifyingPlanId(null);
    setCurrentView('plans');
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
            onModifyWithAI={handleModifyWithAI}
            createTask={createTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            addTaskLog={addTaskLog}
          />
        );
      case 'tasks':
        // Redirect to plans if tasks is selected, or just render PlanManager
        // Since we are merging, maybe we can remove the 'tasks' view or make it redirect
        // For now, let's keep it but it might be redundant if PlanManager has everything
        return (
          <PlanManager 
            plans={plans} 
            onPlanSelect={handlePlanSelect}
            createPlan={createPlan}
            updatePlan={updatePlan}
            deletePlan={deletePlan}
            exportData={exportData}
            importData={importData}
            onModifyWithAI={handleModifyWithAI}
            createTask={createTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            addTaskLog={addTaskLog}
          />
        );
      case 'ai-planning':
        return (
          <AIPlanView 
            onPlanGenerated={handleAIPlanGenerated} 
            initialPlan={modifyingPlan}
            onPlanUpdated={handleAIPlanUpdated}
            onCancel={handleAICancel}
          />
        );
      case 'extensions':
        return <ExtensionsView />;
      case 'settings':
        return <Settings showExtensions={showExtensions} onShowExtensionsChange={handleShowExtensionsChange} />;
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
    'settings': '设置',
    'ai-planning': 'AI 计划',
    'extensions': '扩展功能 (DLC)'
  }), []);

  const handleShowExtensionsChange = useCallback(async (show: boolean) => {
    setShowExtensions(show);
    if (window.ipcRenderer) {
        try {
            const current = await window.ipcRenderer.invoke('getSettings');
            await window.ipcRenderer.invoke('saveSettings', { ...current, showExtensions: show });
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    } else {
        // Fallback for browser dev
        const current = localStorage.getItem('app_settings') ? JSON.parse(localStorage.getItem('app_settings')!) : {};
        localStorage.setItem('app_settings', JSON.stringify({ ...current, showExtensions: show }));
    }
  }, []);

  return (
    <div className={`app ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobile ? 'mobile' : ''}`}>

      {!isMobile && <TitleBar title={viewTitles[currentView]} />}
      <div className="app-content">
        <Sidebar 
          currentView={currentView}
          onViewChange={handleViewChange}
          isCollapsed={isSidebarCollapsed}
          onToggle={handleToggleSidebar}
          showExtensions={showExtensions}
        />
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
      <NotificationContainer 
        notifications={notifications}
        onRemove={removeNotification}
      />

      {dialogState && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            WebkitAppRegion: 'no-drag',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            style={{
              width: 'min(520px, 92vw)',
              background: 'var(--surface-color)',
              color: 'var(--text-primary)',
              borderRadius: 12,
              border: '1px solid var(--border-color)',
              boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
              padding: 16,
              WebkitAppRegion: 'no-drag',
            }}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>
              {dialogState.title || '提示'}
            </div>
            <div style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {dialogState.message}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              {dialogState.type === 'confirm' && (
                <button className="btn" onClick={() => closeDialog(false)}>
                  取消
                </button>
              )}
              <button className="btn btn-primary" onClick={() => closeDialog(true)}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

App.displayName = 'App';

export default App;
