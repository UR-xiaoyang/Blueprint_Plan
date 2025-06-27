import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import { 
  TrendingUp, 
  Calendar,
  Clock,
  Layers,
  GitBranch,
  Zap
} from 'lucide-react';
import { Plan } from '../App';

interface AdvancedChartsProps {
  plans: Plan[];
}

const AdvancedCharts: React.FC<AdvancedChartsProps> = ({ plans }) => {
  const advancedData = useMemo(() => {
    const allTasks = plans.flatMap(plan => plan.tasks);
    
    // 月度完成趋势（最近12个月）
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' }),
        value: date.getMonth() + 1,
        year: date.getFullYear()
      };
    }).reverse();

    const monthlyData = last12Months.map(monthInfo => {
      const completed = allTasks.filter(task => {
        const taskDate = new Date(task.updatedAt);
        return taskDate.getMonth() + 1 === monthInfo.value && 
               taskDate.getFullYear() === monthInfo.year &&
               task.status === 'completed';
      }).length;
      
      const created = allTasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate.getMonth() + 1 === monthInfo.value && 
               taskDate.getFullYear() === monthInfo.year;
      }).length;
      
      return { month: monthInfo.month, completed, created };
    });

    // 计划进度热力图数据
    const heatmapData = plans.map((plan, index) => [
      index,
      0,
      plan.progress
    ]);

    // 任务复杂度分析（基于描述长度和优先级）
    const complexityData = allTasks.map(task => ({
      name: task.title.substring(0, 20),
      complexity: task.description.length + (task.priority === 'high' ? 50 : task.priority === 'medium' ? 25 : 0),
      priority: task.priority,
      status: task.status
    })).sort((a, b) => b.complexity - a.complexity).slice(0, 10);

    // 工作负载分布（按计划）
    const workloadData = plans.map(plan => ({
      name: plan.title.substring(0, 15),
      value: plan.tasks.length,
      progress: plan.progress,
      status: plan.status
    }));

    return {
      monthlyData,
      heatmapData,
      complexityData,
      workloadData
    };
  }, [plans]);

  // 月度趋势双轴图
  const monthlyTrendOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' }
    },
    legend: {
      data: ['创建任务', '完成任务'],
      textStyle: { color: '#94a3b8' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: advancedData.monthlyData.map(item => item.month),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' }
    },
    yAxis: [
      {
        type: 'value',
        name: '任务数量',
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#f1f5f9' } }
      }
    ],
    series: [
      {
        name: '创建任务',
        type: 'bar',
        barWidth: '40%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#8b5cf6' },
              { offset: 1, color: '#6366f1' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        data: advancedData.monthlyData.map(item => item.created)
      },
      {
        name: '完成任务',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: '#10b981'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
            ]
          }
        },
        data: advancedData.monthlyData.map(item => item.completed)
      }
    ]
  };

  // 计划进度热力图
  const heatmapOption = {
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' },
      formatter: (params: any) => {
        const planIndex = params.data[0];
        const progress = params.data[2];
        const planName = plans[planIndex]?.title || '未知计划';
        return `${planName}<br/>进度: ${progress}%`;
      }
    },
    grid: {
      height: '50%',
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: plans.map((_, index) => `计划${index + 1}`),
      splitArea: {
        show: true
      },
      axisLabel: { color: '#64748b' }
    },
    yAxis: {
      type: 'category',
      data: ['进度'],
      splitArea: {
        show: true
      },
      axisLabel: { color: '#64748b' }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '15%',
      inRange: {
        color: ['#1e293b', '#6366f1', '#10b981']
      },
      textStyle: { color: '#94a3b8' }
    },
    series: [{
      name: '计划进度',
      type: 'heatmap',
      data: advancedData.heatmapData,
      label: {
        show: true,
        formatter: '{c}%',
        color: '#fff'
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };

  // 任务复杂度气泡图
  const complexityBubbleOption = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' }
    },
    grid: {
      left: '3%',
      right: '7%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '复杂度指数',
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9' } }
    },
    yAxis: {
      type: 'category',
      data: advancedData.complexityData.map(item => item.name),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b' }
    },
    series: [{
      name: '任务复杂度',
      type: 'scatter',
      symbolSize: (data: any) => Math.sqrt(data[0]) * 2,
      itemStyle: {
        color: (params: any) => {
          const task = advancedData.complexityData[params.dataIndex];
          if (task.priority === 'high') return '#ef4444';
          if (task.priority === 'medium') return '#f59e0b';
          return '#22c55e';
        },
        opacity: 0.8
      },
      data: advancedData.complexityData.map((item, index) => [item.complexity, index])
    }]
  };

  // 工作负载甜甜圈图
  const workloadDonutOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' },
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: { color: '#64748b' }
    },
    series: [
      {
        name: '工作负载',
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
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
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: advancedData.workloadData.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: [
              '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', 
              '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'
            ][index % 8]
          }
        }))
      }
    ]
  };

  // 进度仪表盘
  const overallProgressOption = {
    backgroundColor: 'transparent',
    series: [
      {
        name: '整体进度',
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '75%'],
        radius: '90%',
        min: 0,
        max: 100,
        splitNumber: 8,
        axisLine: {
          lineStyle: {
            width: 6,
            color: [
              [0.25, '#ef4444'],
              [0.5, '#f59e0b'],
              [0.75, '#06b6d4'],
              [1, '#10b981']
            ]
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '12%',
          width: 20,
          offsetCenter: [0, '-60%'],
          itemStyle: {
            color: 'auto'
          }
        },
        axisTick: {
          length: 12,
          lineStyle: {
            color: 'auto',
            width: 2
          }
        },
        splitLine: {
          length: 20,
          lineStyle: {
            color: 'auto',
            width: 5
          }
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 12,
          distance: -60,
          rotate: 'tangential',
          formatter: function (value: number) {
            if (value === 87.5) {
              return '优秀';
            } else if (value === 62.5) {
              return '良好';
            } else if (value === 37.5) {
              return '一般';
            } else if (value === 12.5) {
              return '需努力';
            }
            return '';
          }
        },
        title: {
          offsetCenter: [0, '-10%'],
          fontSize: 16,
          color: '#94a3b8'
        },
        detail: {
          fontSize: 30,
          offsetCenter: [0, '-35%'],
          valueAnimation: true,
          formatter: function (value: number) {
            return Math.round(value) + '%';
          },
          color: 'auto'
        },
        data: [
          {
            value: plans.reduce((sum, plan) => sum + plan.progress, 0) / plans.length || 0,
            name: '平均完成度'
          }
        ]
      }
    ]
  };

  return (
    <div className="advanced-charts-container">
      <div className="charts-grid">
        {/* 月度趋势双轴图 */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="chart-header">
            <h3 className="chart-title">
              <Calendar size={20} />
              月度趋势分析
            </h3>
          </div>
          <div className="chart-content">
            <ReactECharts 
              option={monthlyTrendOption} 
              style={{ height: '350px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </motion.div>

        {/* 计划进度热力图 */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="chart-header">
            <h3 className="chart-title">
              <Layers size={20} />
              计划进度热力图
            </h3>
          </div>
          <div className="chart-content">
            <ReactECharts 
              option={heatmapOption} 
              style={{ height: '350px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </motion.div>

        {/* 任务复杂度气泡图 */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="chart-header">
            <h3 className="chart-title">
              <GitBranch size={20} />
              任务复杂度分析
            </h3>
          </div>
          <div className="chart-content">
            <ReactECharts 
              option={complexityBubbleOption} 
              style={{ height: '350px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </motion.div>

        {/* 工作负载分布 */}
        <motion.div 
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="chart-header">
            <h3 className="chart-title">
              <Clock size={20} />
              工作负载分布
            </h3>
          </div>
          <div className="chart-content">
            <ReactECharts 
              option={workloadDonutOption} 
              style={{ height: '350px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </motion.div>

        {/* 整体进度仪表盘 */}
        <motion.div 
          className="chart-card chart-card-wide"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="chart-header">
            <h3 className="chart-title">
              <Zap size={20} />
              整体进度仪表盘
            </h3>
          </div>
          <div className="chart-content">
            <ReactECharts 
              option={overallProgressOption} 
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdvancedCharts; 