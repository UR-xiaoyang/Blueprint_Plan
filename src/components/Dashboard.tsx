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
  // ---------------- Helper Functions ----------------
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

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  // ---------------- Data Processing ----------------

  // Statistics for Overview Cards
  const stats = useMemo(() => {
    const totalPlans = plans.length;
    const activePlans = plans.filter(p => p.status === 'in-progress' || p.status === 'planning').length;
    const completedPlans = plans.filter(p => p.status === 'completed').length;
    
    // Calculate total tasks and pending tasks across all plans
    const allTasks = plans.flatMap(p => p.tasks || []);
    const totalTasks = allTasks.length;
    const pendingTasks = allTasks.filter(t => t.status !== 'completed').length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;

    // Calculate completion rate
    const completionRate = totalPlans > 0 
      ? Math.round((completedPlans / totalPlans) * 100) 
      : 0;

    return {
      totalPlans,
      activePlans,
      completedPlans,
      totalTasks,
      pendingTasks,
      completedTasks,
      completionRate
    };
  }, [plans]);

  // Chart Data: Plan Status Distribution
  const pieChartData = useMemo(() => {
    const counts = plans.reduce((acc, plan) => {
      acc[plan.status] = (acc[plan.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return [
      { name: '规划中', value: counts['planning'] || 0, color: '#3B82F6' },
      { name: '进行中', value: counts['in-progress'] || 0, color: '#F97316' },
      { name: '已完成', value: counts['completed'] || 0, color: '#22C55E' },
      { name: '已归档', value: counts['archived'] || 0, color: '#6B7280' },
    ].filter(item => item.value > 0);
  }, [plans]);

  // Chart Data: Task Priority Distribution (or any other meaningful metric)
  const taskPriorityData = useMemo(() => {
    const allTasks = plans.flatMap(p => p.tasks || []);
    const counts = allTasks.reduce((acc, task) => {
      if (task.status !== 'completed') {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: '高优先级', value: counts['high'] || 0, color: '#EF4444' },
      { name: '中优先级', value: counts['medium'] || 0, color: '#F59E0B' },
      { name: '低优先级', value: counts['low'] || 0, color: '#3B82F6' },
    ];
  }, [plans]);

  // Today's Tasks
  const todaysTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return plans
      .flatMap(plan => plan.tasks || [])
      .filter(task => {
        if (!task || task.status === 'completed') return false;
        const startDate = new Date(task.startDate);
        const dueDate = new Date(task.dueDate);
        startDate.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return (
          (task.status === 'todo' || task.status === 'in-progress') &&
          startDate <= today &&
          dueDate >= today
        );
      })
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }, [plans]);

  // Recent Plans
  const recentPlans = useMemo(() => {
    return plans
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4); // Limit to 4
  }, [plans]);

  // ---------------- Render ----------------

  return (
    <div className="dashboard-container">
      
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h1 className="dashboard-title">
            仪表盘
          </h1>
          <p className="dashboard-date">
            {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="dashboard-clock-wrapper">
           <Clock />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="overview-grid">
        <OverviewCard 
          title="活跃计划" 
          value={stats.activePlans} 
          icon="📋" 
          color="#3B82F6" 
          subtitle={`总计 ${stats.totalPlans} 个计划`}
        />
        <OverviewCard 
          title="待办任务" 
          value={stats.pendingTasks} 
          icon="📝" 
          color="#F59E0B" 
          subtitle={`今日 ${todaysTasks.length} 个任务`}
        />
        <OverviewCard 
          title="已完成任务" 
          value={stats.completedTasks} 
          icon="✅" 
          color="#10B981" 
          subtitle={`总任务 ${stats.totalTasks}`}
        />
        <OverviewCard 
          title="计划完成率" 
          value={`${stats.completionRate}%`} 
          icon="📈" 
          color="#8B5CF6" 
          subtitle="基于所有计划"
        />
      </div>

      {/* Main Content Grid */}
      <div className="charts-grid">
        
        {/* Charts Section */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>计划状态分布</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>待办任务优先级</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={taskPriorityData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border-color)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fill: 'var(--text-secondary)'}} />
                <Tooltip 
                  cursor={{fill: 'var(--surface-hover)'}}
                  contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                  {taskPriorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bottom-grid">
        
        {/* Today's Tasks List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📅 今日待办</h3>
            <span className="card-subtitle">{todaysTasks.length} 个任务</span>
          </div>
          
          <div className="task-list-container">
            {todaysTasks.length > 0 ? (
              todaysTasks.map(task => (
                <div key={task.id} className="task-list-item" style={{ borderLeft: `4px solid ${getPriorityColor(task.priority)}` }}>
                  <div className="task-info">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                       截止: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`task-status-badge ${task.status === 'in-progress' ? 'task-status-in-progress' : 'task-status-todo'}`}>
                    {task.status === 'in-progress' ? '进行中' : '待办'}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                今天没有待办任务，享受生活吧！🎉
              </div>
            )}
          </div>
        </div>

        {/* Recent Plans */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 最近计划</h3>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => onNavigate('plans')}
            >
              全部计划
            </button>
          </div>

          <div className="plan-list-container">
            {recentPlans.length > 0 ? (
              recentPlans.map(plan => (
                <PlanItem
                  key={plan.id}
                  plan={plan}
                  onSelect={onPlanSelect}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                />
              ))
            ) : (
              <div className="empty-state">
                还没有创建任何计划
                <br />
                <button 
                  className="btn btn-primary" 
                  style={{ marginTop: '1rem' }}
                  onClick={() => onNavigate('plans')}
                >
                  创建第一个计划
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
});

// ---------------- Sub-components ----------------

const OverviewCard = ({ title, value, icon, color, subtitle }: { title: string, value: string | number, icon: string, color: string, subtitle: string }) => (
  <div className="card overview-card-content">
    <div className="overview-icon-bg" style={{ color: color }}>
      {icon}
    </div>
    <h4 className="overview-title">{title}</h4>
    <div className="overview-value">
      {value}
    </div>
    <div className="overview-subtitle">
      {subtitle}
    </div>
  </div>
);

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
  
  return (
    <div 
      className={`plan-item`}
      onClick={handleClick}
    >
      <div className="plan-header">
        <h4 className="plan-title">{plan.title}</h4>
        <span className={`status-badge ${getStatusColor(plan.status)}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
          {getStatusText(plan.status)}
        </span>
      </div>
      
      <div className="plan-progress-wrapper">
        <div className="plan-progress-track">
          <div 
            className="plan-progress-fill" 
            style={{ 
              width: `${plan.progress}%`, 
              backgroundColor: getStatusColor(plan.status) === 'status-completed' ? '#10B981' : '#3B82F6',
            }}
          ></div>
        </div>
        <span className="plan-progress-text">{plan.progress.toFixed(0)}%</span>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';
PlanItem.displayName = 'PlanItem';

export default Dashboard;
