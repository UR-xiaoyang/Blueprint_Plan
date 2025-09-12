import { useState, memo, useCallback, useMemo, useRef, FC } from 'react';

// Plan interface definition
interface Plan {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'in-progress' | 'completed' | 'archived';
  progress: number;
  tasks: any[]; // Define task type properly
  createdAt: string;
  updatedAt: string;
}

interface PlanManagerProps {
  plans: Plan[];
  onPlanSelect: (plan: Plan) => void;
  createPlan: (plan: Omit<Plan, 'id' | 'progress' | 'tasks' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePlan: (plan: Plan) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  exportData?: () => Promise<void>;
  importData?: (jsonData: string) => Promise<void>;
}

interface PlanFormProps {
  editingPlan: Plan | null;
  formData: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    status: Plan['status'];
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const PlanForm: FC<PlanFormProps> = memo(({
  editingPlan,
  formData,
  onInputChange,
  onSubmit,
  onCancel
}) => (
  <div className="plan-form-container">
    <form onSubmit={onSubmit} className="plan-form">
      <h2>{editingPlan ? '编辑计划' : '创建新计划'}</h2>
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

interface PlanCardProps {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (planId: string) => void;
  onSelect: (plan: Plan) => void;
  getStatusColor: (status: Plan['status']) => string;
  getStatusText: (status: Plan['status']) => string;
}

const PlanCard: FC<PlanCardProps> = memo(({ 
  plan, 
  onEdit, 
  onDelete, 
  onSelect, 
  getStatusColor, 
  getStatusText 
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
              style={{ transform: `scaleX(${plan.progress / 100})` }}
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

const PlanManager: FC<PlanManagerProps> = memo(({ 
  plans, 
  onPlanSelect, 
  createPlan, 
  updatePlan, 
  deletePlan,
  exportData,
  importData
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'planning' as Plan['status']
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPlan) {
        const updatedPlan: Plan = {
          ...editingPlan,
          ...formData,
          updatedAt: new Date().toISOString()
        };
        await updatePlan(updatedPlan);
        setEditingPlan(null);
      } else {
        await createPlan({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          startDate: formData.startDate,
          endDate: formData.endDate
        });
      }

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

  const handleDownloadGenericTemplate = () => {
    const genericPlan = {
      id: "请为每个计划提供一个唯一ID，或留空由系统自动生成",
      title: "你的计划标题",
      description: "你的计划描述",
      status: "planning",
      startDate: "YYYY-MM-DD",
      endDate: "YYYY-MM-DD",
      tasks: [
        {
          id: "请为每个任务提供一个唯一ID，或留空由系统自动生成",
          title: "任务1标题",
          description: "任务1描述",
          status: "todo",
          priority: "medium",
          startDate: "YYYY-MM-DD",
          dueDate: "YYYY-MM-DD"
        }
      ]
    };

    const fileContent = [genericPlan];
    
    const jsonData = JSON.stringify(fileContent, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plan_template.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

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

  const handleExport = useCallback(async () => {
    if (exportData) {
      try {
        await exportData();
        alert('导出成功！文件已保存到您的下载文件夹。');
      } catch (error) {
        console.error('导出失败:', error);
        alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  }, [exportData]);

  const handleImportClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && importData) {
      try {
        const jsonData = await file.text();
        console.log('[PlanManager] File content read:', jsonData);
        await importData(jsonData);
        alert('计划导入成功！');
      } catch (error) {
        console.error('导入失败:', error);
        alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  }, [importData]);

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

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [plans]);

  return (
    <div className="plan-manager">
      <div className="plan-manager-header">
        <div className="plan-manager-title">
          <h2>计划管理</h2>
          <button 
            className="btn btn-primary"
            onClick={() => { setShowCreateForm(true); setEditingPlan(null); }}
            disabled={showCreateForm}
          >
            + 创建新计划
          </button>
        </div>
        <div className="plan-manager-actions">
          <button
            className="btn btn-secondary"
            onClick={handleDownloadGenericTemplate}
            title="下载一个空的JSON模板文件，用于编辑后批量导入"
          >
            📄 下载通用模板
          </button>
          
          <div className="import-export-actions">
            {importData && (
              <>
                <button 
                  className="btn btn-secondary"
                  onClick={handleImportClick}
                  title="导入计划"
                >
                  📥 导入
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </>
            )}
            
            {exportData && plans.length > 0 && (
              <button 
                className="btn btn-secondary"
                onClick={handleExport}
                title="导出计划"
              >
                📤 导出
              </button>
            )}
          </div>
        </div>
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

      {plans.length === 0 && !showCreateForm && (
        <div className="empty-state">
          <p>还没有任何计划。点击上方按钮创建您的第一个计划！</p>
        </div>
      )}

      {plans.length > 0 && (
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
  );
});

PlanManager.displayName = 'PlanManager';
PlanForm.displayName = 'PlanForm';
PlanCard.displayName = 'PlanCard';

export default PlanManager;