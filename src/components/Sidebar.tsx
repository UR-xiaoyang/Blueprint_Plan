import React, { memo, useCallback } from 'react';
import { LayoutDashboard, ClipboardList, CheckSquare, Settings, ChevronLeft, ChevronRight, Sparkles, Package } from 'lucide-react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  showExtensions?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = memo(({ currentView, onViewChange, isCollapsed, onToggle, showExtensions = false }) => {
  const handleViewChange = useCallback((view: ViewType) => {
    return () => onViewChange(view);
  }, [onViewChange]);

  // Force inline styles for debug/fix on Android
  const sidebarStyle: React.CSSProperties = {
    backgroundColor: 'var(--sidebar-background)',
    // Ensure it's not transparent
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    // paddingTop removed to allow CSS media queries to handle it
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={sidebarStyle}>
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
        {/* Task view merged into Plans
        <button
          className={`nav-item ${currentView === 'tasks' ? 'active' : ''}`}
          onClick={handleViewChange('tasks')}
          data-tooltip="任务"
        >
          <span className="nav-icon"><CheckSquare size={20} /></span>
          <span className="nav-text">任务</span>
        </button>
        */}

        <button
          className={`nav-item ${currentView === 'ai-planning' ? 'active' : ''}`}
          onClick={handleViewChange('ai-planning')}
          data-tooltip="AI 计划"
        >
          <span className="nav-icon"><Sparkles size={20} /></span>
          <span className="nav-text">AI 计划</span>
        </button>

        {showExtensions && (
          <button
            className={`nav-item ${currentView === 'extensions' ? 'active' : ''}`}
            onClick={handleViewChange('extensions')}
            data-tooltip="扩展 (DLC)"
          >
            <span className="nav-icon"><Package size={20} /></span>
            <span className="nav-text">扩展 (DLC)</span>
          </button>
        )}

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