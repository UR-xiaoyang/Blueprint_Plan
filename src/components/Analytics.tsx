import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import CountUp from 'react-countup';
import { 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  PieChart, 
  Activity,
  Calendar,
  Users,
  Zap,
  Award,
  AlertTriangle,
  Layers,
  GitBranch
} from 'lucide-react';
import { Plan, Task } from '../App';
import AdvancedCharts from './AdvancedCharts';

interface AnalyticsProps {
  plans: Plan[];
}

interface StatCardProps {
  title: string;
  value: number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  unit = '', 
  icon, 
  color, 
  trend, 
  description 
}) => (
  <motion.div
    className="stat-card"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
    transition={{ duration: 0.3 }}
  >
    <div className="stat-card-header">
      <div className="stat-icon" style={{ backgroundColor: `${color}20`, color }}>
        {icon}
      </div>
      {trend !== undefined && (
        <div className={`trend ${trend >= 0 ? 'positive' : 'negative'}`}>
          <TrendingUp size={16} />
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
    <div className="stat-content">
      <h3 className="stat-value">
        <CountUp end={value} duration={2} separator="," />
        {unit}
      </h3>
      <p className="stat-title">{title}</p>
      {description && <p className="stat-description">{description}</p>}
    </div>
  </motion.div>
);

const Analytics: React.FC<AnalyticsProps> = ({ plans }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const analyticsData = useMemo(() => {
    const allTasks = plans.flatMap(plan => plan.tasks);
    const completedTasks = allTasks.filter(task => task.status === 'completed');
    const inProgressTasks = allTasks.filter(task => task.status === 'in-progress');
    const todoTasks = allTasks.filter(task => task.status === 'todo');
    
    const completedPlans = plans.filter(plan => plan.status === 'completed');
    const activePlans = plans.filter(plan => plan.status === 'in-progress');
    
    const totalProgress = plans.reduce((sum, plan) => sum + plan.progress, 0) / plans.length || 0;
    
    // 优先级分布
    const priorityDistribution = {
      high: allTasks.filter(task => task.priority === 'high').length,
      medium: allTasks.filter(task => task.priority === 'medium').length,
      low: allTasks.filter(task => task.priority === 'low').length,
    };

    // 每日完成任务趋势（最近7天）
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyCompletions = last7Days.map(date => {
      const completed = completedTasks.filter(task => 
        task.updatedAt.startsWith(date)
      ).length;
      return { date, completed };
    });

    // 计划状态分布
    const planStatusDistribution = {
      planning: plans.filter(p => p.status === 'planning').length,
      'in-progress': plans.filter(p => p.status === 'in-progress').length,
      completed: plans.filter(p => p.status === 'completed').length,
      archived: plans.filter(p => p.status === 'archived').length,
    };

    return {
      totalTasks: allTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      todoTasks: todoTasks.length,
      totalPlans: plans.length,
      completedPlans: completedPlans.length,
      activePlans: activePlans.length,
      completionRate: allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0,
      totalProgress,
      priorityDistribution,
      dailyCompletions,
      planStatusDistribution
    };
  }, [plans]);

  // ECharts 配置
  const taskStatusPieOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' }
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: { color: '#64748b' }
    },
    series: [
      {
        name: '任务状态',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: analyticsData.completedTasks, name: '已完成', itemStyle: { color: '#10b981' } },
          { value: analyticsData.inProgressTasks, name: '进行中', itemStyle: { color: '#f59e0b' } },
          { value: analyticsData.todoTasks, name: '待办', itemStyle: { color: '#6366f1' } }
        ]
      }
    ]
  };

  const dailyTrendOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: analyticsData.dailyCompletions.map(item => 
        new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
      ),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    series: [
      {
        name: '完成任务',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#6366f1' },
              { offset: 1, color: '#8b5cf6' }
            ]
          }
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99, 102, 241, 0.3)' },
              { offset: 1, color: 'rgba(99, 102, 241, 0.05)' }
            ]
          }
        },
        data: analyticsData.dailyCompletions.map(item => item.completed)
      }
    ]
  };

  const priorityBarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['高优先级', '中优先级', '低优先级'],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    series: [
      {
        name: '任务数量',
        type: 'bar',
        barWidth: '60%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (params: any) => {
            const colors = ['#ef4444', '#f59e0b', '#22c55e'];
            return colors[params.dataIndex];
          }
        },
        data: [
          analyticsData.priorityDistribution.high,
          analyticsData.priorityDistribution.medium,
          analyticsData.priorityDistribution.low
        ]
      }
    ]
  };

  const planStatusRadarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' }
    },
    radar: {
      indicator: [
        { name: '规划中', max: Math.max(analyticsData.totalPlans, 10) },
        { name: '进行中', max: Math.max(analyticsData.totalPlans, 10) },
        { name: '已完成', max: Math.max(analyticsData.totalPlans, 10) },
        { name: '已归档', max: Math.max(analyticsData.totalPlans, 10) }
      ],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      splitArea: { show: false }
    },
    series: [
      {
        name: '计划状态分布',
        type: 'radar',
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#6366f1', width: 2 },
        areaStyle: { color: 'rgba(99, 102, 241, 0.2)' },
        data: [
          {
            value: [
              analyticsData.planStatusDistribution.planning,
              analyticsData.planStatusDistribution['in-progress'],
              analyticsData.planStatusDistribution.completed,
              analyticsData.planStatusDistribution.archived
            ],
            name: '计划分布'
          }
        ]
      }
    ]
  };

  return (
    <div className="analytics-dashboard">
      {/* 头部信息 */}
      <motion.div 
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-content">
          <div className="header-info">
            <h1 className="dashboard-title">数据可视化大屏</h1>
            <p className="dashboard-subtitle">实时监控您的计划和任务执行情况</p>
          </div>
          <div className="header-time">
            <div className="current-time">
              {currentTime.toLocaleTimeString('zh-CN')}
            </div>
            <div className="current-date">
              {currentTime.toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 核心指标卡片 */}
      <div className="stats-grid">
        <StatCard
          title="总任务数"
          value={analyticsData.totalTasks}
          icon={<Target size={24} />}
          color="#6366f1"
          trend={12}
          description="所有计划中的任务总数"
        />
        <StatCard
          title="完成任务"
          value={analyticsData.completedTasks}
          icon={<CheckCircle size={24} />}
          color="#10b981"
          trend={8}
          description="已成功完成的任务"
        />
        <StatCard
          title="完成率"
          value={Math.round(analyticsData.completionRate)}
          unit="%"
          icon={<Activity size={24} />}
          color="#f59e0b"
          trend={5}
          description="任务整体完成百分比"
        />
        <StatCard
          title="活跃计划"
          value={analyticsData.activePlans}
          icon={<Zap size={24} />}
          color="#8b5cf6"
          trend={-2}
          description="正在进行中的计划"
        />
        <StatCard
          title="平均进度"
          value={Math.round(analyticsData.totalProgress)}
          unit="%"
          icon={<BarChart3 size={24} />}
          color="#06b6d4"
          trend={15}
          description="所有计划的平均完成度"
        />
        <StatCard
          title="高优先级"
          value={analyticsData.priorityDistribution.high}
          icon={<AlertTriangle size={24} />}
          color="#ef4444"
          description="需要优先处理的任务"
        />
      </div>

      {/* 图表区域 */}
      <div className="charts-grid">
        {/* 任务状态分布饼图 */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="chart-header">
            <h3 className="chart-title">
              <PieChart size={20} />
              任务状态分布
            </h3>
          </div>
          <div className="chart-content">
            <ReactECharts 
              option={taskStatusPieOption} 
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </motion.div>

        {/* 每日完成趋势 */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="chart-header">
            <h3 className="chart-title">
              <TrendingUp size={20} />
              完成趋势（7天）
            </h3>
          </div>
          <div className="chart-content">
            <ReactECharts 
              option={dailyTrendOption} 
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </motion.div>

        {/* 优先级分布柱状图 */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="chart-header">
            <h3 className="chart-title">
              <BarChart3 size={20} />
              优先级分布
            </h3>
          </div>
          <div className="chart-content">
            <ReactECharts 
              option={priorityBarOption} 
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </motion.div>

        {/* 计划状态雷达图 */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="chart-header">
            <h3 className="chart-title">
              <Activity size={20} />
              计划状态雷达
            </h3>
          </div>
          <div className="chart-content">
            <ReactECharts 
              option={planStatusRadarOption} 
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </motion.div>
      </div>

      {/* 高级图表区域 */}
      <motion.div
        className="advanced-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <div className="section-header">
          <h2 className="section-title">
            <Layers size={24} />
            高级数据分析
          </h2>
          <p className="section-subtitle">深度洞察您的项目数据趋势和模式</p>
        </div>
        {/* <AdvancedCharts plans={plans} /> */}
      </motion.div>

      {/* 底部详细信息 */}
      <motion.div 
        className="analytics-footer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <div className="footer-stats">
          <div className="footer-stat">
            <Calendar size={16} />
            <span>数据更新时间: {currentTime.toLocaleString('zh-CN')}</span>
          </div>
          <div className="footer-stat">
            <Users size={16} />
            <span>监控计划: {analyticsData.totalPlans} 个</span>
          </div>
          <div className="footer-stat">
            <Award size={16} />
            <span>完成计划: {analyticsData.completedPlans} 个</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics; 