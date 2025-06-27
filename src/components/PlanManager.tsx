import React, { useState, memo, useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Plan } from '../App';

interface PlanManagerProps {
  plans: Plan[];
  onPlanSelect: (plan: Plan) => void;
  createPlan: (plan: Omit<Plan, 'id' | 'progress' | 'tasks' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePlan: (plan: Plan) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
}

const PlanManager: React.FC<PlanManagerProps> = memo(({ plans, onPlanSelect, createPlan, updatePlan, deletePlan }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'planning' as Plan['status']
  });

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPlan) {
        // 编辑现有计划
        const updatedPlan: Plan = {
          ...editingPlan,
          ...formData,
          updatedAt: new Date().toISOString()
        };
        await updatePlan(updatedPlan);
        setEditingPlan(null);
      } else {
        // 创建新计划
        await createPlan({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          startDate: formData.startDate,
          endDate: formData.endDate
        });
      }

      // 重置表单
      setFormData({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'planning'
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    }
  }, [editingPlan, formData, createPlan, updatePlan]);

  const handleEdit = useCallback((plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      title: plan.title,
      description: plan.description,
      startDate: plan.startDate,
      endDate: plan.endDate,
      status: plan.status
    });
    setShowCreateForm(true);
  }, []);

  const handleDelete = useCallback(async (planId: string) => {
    if (window.confirm('确定要删除这个计划吗？此操作无法撤销。')) {
      try {
        await deletePlan(planId);
      } catch (error) {
        console.error('删除计划失败:', error);
        alert('删除计划失败，请重试');
      }
    }
  }, [deletePlan]);

  const handleCancel = useCallback(() => {
    setShowCreateForm(false);
    setEditingPlan(null);
    setFormData({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'planning'
    });
  }, []);

  const getStatusColor = useCallback((status: Plan['status']) => {
    switch (status) {
      case 'planning': return 'status-planning';
      case 'in-progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      case 'archived': return 'status-archived';
      default: return 'status-planning';
    }
  }, []);

  const getStatusText = useCallback((status: Plan['status']) => {
    switch (status) {
      case 'planning': return '规划中';
      case 'in-progress': return '进行中';
      case 'completed': return '已完成';
      case 'archived': return '已归档';
      default: return '未知';
    }
  }, []);

  // 缓存排序后的计划列表
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [plans]);

  return (
    <div className="plan-manager">
      <div className="page-header">
        <h2 className="page-title">计划管理</h2>
        <p className="page-description">创建、编辑和管理您的所有计划。</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">我的计划</h3>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            ➕ 创建新计划
          </button>
        </div>

        {showCreateForm && (
          <PlanForm
            editingPlan={editingPlan}
            formData={formData}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}

        {plans.length === 0 ? (
          <div className="empty-state">
            <p>还没有任何计划。点击上方按钮创建您的第一个计划！</p>
          </div>
        ) : (
          <div className="plan-list-container">
            {sortedPlans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={handleEdit}
                onDelete={handleDelete}
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

// 将表单提取为单独的组件
const PlanForm = memo(({ 
  editingPlan, 
  formData, 
  onInputChange, 
  onSubmit, 
  onCancel 
}: {
  editingPlan: Plan | null;
  formData: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) => (
  <div className="create-form">
    <h4>{editingPlan ? '编辑计划' : '创建新计划'}</h4>
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="title">计划标题 *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={onInputChange}
          required
          placeholder="输入计划标题"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">计划描述</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={onInputChange}
          rows={3}
          placeholder="描述您的计划目标和内容"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startDate">开始日期 *</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={onInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="endDate">结束日期 *</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={onInputChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="status">状态</label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={onInputChange}
        >
          <option value="planning">规划中</option>
          <option value="in-progress">进行中</option>
          <option value="completed">已完成</option>
          <option value="archived">已归档</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {editingPlan ? '更新计划' : '创建计划'}
        </button>
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </form>
  </div>
));

// 将计划卡片提取为单独的组件
const PlanCard = memo(({ 
  plan, 
  onEdit, 
  onDelete, 
  onSelect, 
  getStatusColor, 
  getStatusText 
}: {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (planId: string) => void;
  onSelect: (plan: Plan) => void;
  getStatusColor: (status: Plan['status']) => string;
  getStatusText: (status: Plan['status']) => string;
}) => {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(plan);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(plan.id);
  };

  const handleSelect = () => {
    onSelect(plan);
  };
  
  const formattedDates = useMemo(() => ({
    start: plan.startDate ? new Date(plan.startDate).toLocaleDateString('zh-CN') : 'N/A',
    end: plan.endDate ? new Date(plan.endDate).toLocaleDateString('zh-CN') : 'N/A'
  }), [plan.startDate, plan.endDate]);

  return (
    <div className={`plan-card-item ${getStatusColor(plan.status)}`} onClick={handleSelect}>
      <div className="plan-card-main">
        <div className="plan-card-header">
          <h4 className="plan-card-title">{plan.title}</h4>
        </div>
        <p className="plan-card-description">{plan.description}</p>
        <div className="plan-dates">
          <span>{formattedDates.start} - {formattedDates.end}</span>
        </div>
        <div className="plan-card-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${plan.progress}%` }}
              title={`${plan.progress}%`}
            ></div>
          </div>
          <span className="progress-text">{plan.progress}%</span>
        </div>
      </div>
      <div className="plan-card-aside">
        <span className={`status-badge ${getStatusColor(plan.status)}`}>
            {getStatusText(plan.status)}
        </span>
        <div className="plan-card-actions">
          <button className="btn-icon" onClick={handleEdit} title="编辑">✏️</button>
          <button className="btn-icon" onClick={handleDelete} title="删除">🗑️</button>
        </div>
      </div>
    </div>
  );
});

PlanManager.displayName = 'PlanManager';
PlanForm.displayName = 'PlanForm';
PlanCard.displayName = 'PlanCard';

export default PlanManager; 