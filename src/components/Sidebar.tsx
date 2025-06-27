import React, { memo, useCallback } from 'react';

type ViewType = 'dashboard' | 'plans' | 'tasks' | 'analytics' | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  stats: {
    totalPlans: number;
    activePlans: number;
    completedPlans: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = memo(({ currentView, onViewChange, stats, isCollapsed, onToggle }) => {
  const handleViewChange = useCallback((view: ViewType) => {
    return () => onViewChange(view);
  }, [onViewChange]);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <nav>
        <ul className="sidebar-nav">
          <li>
            <button
              className={currentView === 'dashboard' ? 'active' : ''}
              onClick={handleViewChange('dashboard')}
              title="仪表盘"
            >
              <span className="icon">📊</span>
              <span className="text">仪表盘</span>
            </button>
          </li>
          <li>
            <button
              className={currentView === 'plans' ? 'active' : ''}
              onClick={handleViewChange('plans')}
              title="计划管理"
            >
              <span className="icon">📋</span>
              <span className="text">计划管理</span>
            </button>
          </li>
          <li>
            <button
              className={currentView === 'tasks' ? 'active' : ''}
              onClick={handleViewChange('tasks')}
              title="任务管理"
            >
              <span className="icon">✅</span>
              <span className="text">任务管理</span>
            </button>
          </li>
          <li>
            <button
              className={currentView === 'analytics' ? 'active' : ''}
              onClick={handleViewChange('analytics')}
              title="数据分析"
            >
              <span className="icon">📈</span>
              <span className="text">数据分析</span>
            </button>
          </li>
          <li>
            <button
              className={currentView === 'settings' ? 'active' : ''}
              onClick={handleViewChange('settings')}
              title="设置"
            >
              <span className="icon">⚙️</span>
              <span className="text">设置</span>
            </button>
          </li>
        </ul>
      </nav>

      <div className="sidebar-stats">
        <h3><span className="text">统计信息</span></h3>
        <div className="stat-item">
          <span className="stat-label"><span className="text">总计划数</span></span>
          <span className="stat-value">{stats.totalPlans}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label"><span className="text">进行中</span></span>
          <span className="stat-value">{stats.activePlans}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label"><span className="text">已完成</span></span>
          <span className="stat-value">{stats.completedPlans}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label"><span className="text">总任务数</span></span>
          <span className="stat-value">{stats.totalTasks}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label"><span className="text">完成率</span></span>
          <span className="stat-value">{stats.completionRate}%</span>
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="toggle-button" onClick={onToggle} title={isCollapsed ? '展开' : '收起'}>
          <span className="icon">{isCollapsed ? '→' : '←'}</span>
        </button>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar; 