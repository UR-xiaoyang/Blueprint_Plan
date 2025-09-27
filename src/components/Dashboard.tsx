import React, { memo, useMemo } from 'react';
import { Plan, Task } from '../App';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import Clock from './Clock';

interface DashboardProps {
  plans: Plan[];
  onPlanSelect: (plan: Plan) => void;
  onNavigate: (view: 'dashboard' | 'plans' | 'tasks' | 'settings') => void;
}

const Dashboard: React.FC<DashboardProps> = memo(({ plans, onPlanSelect, onNavigate }) => {
  const getStatusColor = (status: Plan['status']) => {
    switch (status) {
      case 'planning': return 'status-planning';
      case 'in-progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      case 'archived': return 'status-archived';
      default: return 'status-planning';
    }
  };

  const getStatusText = (status: Plan['status']) => {
    switch (status) {
      case 'planning': return '规划中';
      case 'in-progress': return '进行中';
      case 'completed': return '已完成';
      case 'archived': return '已归档';
      default: return '未知';
    }
  };

  const statusData = useMemo(() => {
    const counts = plans.reduce((acc, plan) => {
      acc[plan.status] = (acc[plan.status] || 0) + 1;
      return acc;
    }, {} as Record<Plan['status'], number>);
    
    return Object.entries(counts).map(([status, value]) => ({
      name: getStatusText(status as Plan['status']),
      value,
      status: status as Plan['status']
    }));
  }, [plans]);

  const COLORS = {
    planning: '#3B82F6',
    'in-progress': '#F97316',
    completed: '#22C55E',
    archived: '#6B7280',
  };

  const progressData = useMemo(() => {
    return plans.map(plan => ({
      name: plan.title,
      progress: plan.progress,
    }));
  }, [plans]);

  const todaysTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return plans
      .flatMap(plan => plan.tasks)
      .filter(task => {
        const startDate = new Date(task.startDate);
        const dueDate = new Date(task.dueDate);
        startDate.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return (
          (task.status === 'todo' || task.status === 'in-progress') &&
          startDate <= today &&
          dueDate >= today
        );
      });
  }, [plans]);

  // 使用useMemo缓存计算结果，避免每次渲染时重新计算
  const statistics = useMemo(() => {
    const activePlans = plans.filter(plan => plan.status === 'in-progress');
    const completedPlans = plans.filter(plan => plan.status === 'completed');
    const averageProgress = plans.length > 0 
      ? Math.round(plans.reduce((sum, plan) => sum + plan.progress, 0) / plans.length)
      : 0;
    
    return {
      activePlans,
      completedPlans,
      averageProgress,
      totalPlans: plans.length,
      activeCount: activePlans.length,
      completedCount: completedPlans.length
    };
  }, [plans]);

  // 缓存最近的计划列表
  const recentPlans = useMemo(() => {
    return plans
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [plans]);

  return (
    <div className="dashboard">
      <div className="page-header">
        <h2 className="page-title">仪表盘</h2>
        <p className="page-description">欢迎回来！这里是您的计划概览和进度总结。</p>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🕰️ 时间</h3>
          </div>
          <div className="clock-wrapper">
            <Clock />
            <div className="date-display">
              {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">✅ 今日任务</h3>
          </div>
          <div className="today-tasks">
            <h4 className="tasks-title">总任务数: {todaysTasks.length}</h4>
            {todaysTasks.length > 0 ? (
              <ul className="tasks-list">
                {todaysTasks.map(task => (
                  <li key={task.id} className={`task-item priority-${task.priority} status-${task.status}`}>
                    <span className="task-title">{task.title}</span>
                    <span className="task-status">{task.status === 'todo' ? '待办' : '进行中'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-tasks">今天没有任务！</p>
            )}
          </div>
        </div>
      </div>

      {/* 最近的计划 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 最近的计划</h3>
          <button className="btn btn-primary">查看全部</button>
        </div>
        
        {plans.length === 0 ? (
          <div className="empty-state">
            <p>还没有任何计划。开始创建您的第一个计划吧！</p>
            <button className="btn btn-primary" onClick={() => onNavigate('plans')}>创建计划</button>
          </div>
        ) : (
          <div className="plan-list">
            {recentPlans.map(plan => (
              <PlanItem
                key={plan.id}
                plan={plan}
                onSelect={onPlanSelect}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// 将计划项目提取为单独的组件，使用memo优化
const PlanItem = memo(({ 
  plan, 
  onSelect, 
  getStatusColor, 
  getStatusText 
}: {
  plan: Plan;
  onSelect: (plan: Plan) => void;
  getStatusColor: (status: Plan['status']) => string;
  getStatusText: (status: Plan['status']) => string;
}) => {
  const handleClick = () => onSelect(plan);
  
  const formattedDates = useMemo(() => ({
    start: new Date(plan.startDate).toLocaleDateString('zh-CN'),
    end: new Date(plan.endDate).toLocaleDateString('zh-CN')
  }), [plan.startDate, plan.endDate]);

  return (
    <div 
      className={`plan-item status-${plan.status}`}
      onClick={handleClick}
    >
      <div className="plan-info">
        <h4 className="plan-title">{plan.title}</h4>
        <p className="plan-description">{plan.description}</p>
        <div className="plan-meta">
          <span className={`status-badge ${getStatusColor(plan.status)}`}>
            {getStatusText(plan.status)}
          </span>
          <span className="plan-date">
            {formattedDates.start} - {formattedDates.end}
          </span>
        </div>
      </div>
      <div className="plan-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ transform: `scaleX(${plan.progress / 100})` }}
          ></div>
        </div>
        <span className="progress-text">{plan.progress}%</span>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';
PlanItem.displayName = 'PlanItem';

export default Dashboard;