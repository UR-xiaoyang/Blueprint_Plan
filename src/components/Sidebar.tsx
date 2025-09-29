import React, { memo, useCallback } from 'react';

type ViewType = 'dashboard' | 'plans' | 'tasks' | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  isConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = memo(({ currentView, onViewChange, isCollapsed, onToggle, isConnected }) => {
  const handleViewChange = useCallback((view: ViewType) => {
    return () => onViewChange(view);
  }, [onViewChange]);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">Blueprint Plan</h2>
        <button className="sidebar-toggle" onClick={onToggle} title={isCollapsed ? '展开' : '收起'}>
          {isCollapsed ? '→' : '←'}
        </button>
      </div>
      
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={handleViewChange('dashboard')}
          data-tooltip="仪表盘"
        >
          <span className="nav-icon">📊</span>
          <span className="nav-text">仪表盘</span>
        </button>
        <button
          className={`nav-item ${currentView === 'plans' ? 'active' : ''}`}
          onClick={handleViewChange('plans')}
          data-tooltip="计划管理"
        >
          <span className="nav-icon">📋</span>
          <span className="nav-text">计划管理</span>
        </button>
        <button
          className={`nav-item ${currentView === 'tasks' ? 'active' : ''}`}
          onClick={handleViewChange('tasks')}
          data-tooltip="任务管理"
        >
          <span className="nav-icon">✅</span>
          <span className="nav-text">任务管理</span>
        </button>
        <button
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={handleViewChange('settings')}
          data-tooltip="设置"
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-text">设置</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-indicator"></span>
          <span className="status-text">{isConnected ? '已连接' : '未连接'}</span>
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;