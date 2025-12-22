import React, { memo, useCallback } from 'react';
import { LayoutDashboard, ClipboardList, CheckSquare, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

type ViewType = 'dashboard' | 'plans' | 'tasks' | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = memo(({ currentView, onViewChange, isCollapsed, onToggle }) => {
  const handleViewChange = useCallback((view: ViewType) => {
    return () => onViewChange(view);
  }, [onViewChange]);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={handleViewChange('dashboard')}
          data-tooltip="仪表盘"
        >
          <span className="nav-icon"><LayoutDashboard size={20} /></span>
          <span className="nav-text">仪表盘</span>
        </button>
        <button
          className={`nav-item ${currentView === 'plans' ? 'active' : ''}`}
          onClick={handleViewChange('plans')}
          data-tooltip="计划管理"
        >
          <span className="nav-icon"><ClipboardList size={20} /></span>
          <span className="nav-text">计划管理</span>
        </button>
        <button
          className={`nav-item ${currentView === 'tasks' ? 'active' : ''}`}
          onClick={handleViewChange('tasks')}
          data-tooltip="任务"
        >
          <span className="nav-icon"><CheckSquare size={20} /></span>
          <span className="nav-text">任务</span>
        </button>

        <button
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={handleViewChange('settings')}
          data-tooltip="设置"
        >
          <span className="nav-icon"><Settings size={20} /></span>
          <span className="nav-text">设置</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-toggle" onClick={onToggle} title={isCollapsed ? '展开' : '收起'}>
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;