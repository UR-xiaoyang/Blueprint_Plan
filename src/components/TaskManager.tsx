import { useState, useCallback, useMemo, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Plan, Task } from '../App';

interface TaskManagerProps {
  selectedPlan: Plan | null;
  createTask: (planId: string, task: Omit<Task, 'id' | 'planId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (planId: string, taskId: string) => Promise<void>;
}

function TaskManager({ selectedPlan, createTask, updateTask, deleteTask }: TaskManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    status: 'todo' as Task['status'],
    startDate: '',
    dueDate: ''
  });

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlan) return;

    try {
      if (editingTask) {
        // 编辑现有任务
        const updatedTask: Task = {
          ...editingTask,
          ...formData,
          updatedAt: new Date().toISOString()
        };
        await updateTask(updatedTask);
        setEditingTask(null);
      } else {
        // 创建新任务
        await createTask(selectedPlan.id, {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: formData.status,
          startDate: formData.startDate,
          dueDate: formData.dueDate
        });
      }

      // 重置表单
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        startDate: '',
        dueDate: ''
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error("操作失败:", error);
      alert("操作失败，请重试");
    }
  }, [editingTask, formData, selectedPlan, createTask, updateTask]);

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      startDate: task.startDate,
      dueDate: task.dueDate
    });
    setShowCreateForm(true);
  }, []);

  const handleDelete = useCallback(async (taskId: string) => {
    if (!selectedPlan) return;
    
    if (window.confirm('确定要删除这个任务吗？此操作无法撤销。')) {
      try {
        await deleteTask(selectedPlan.id, taskId);
      } catch (error) {
        console.error('删除任务失败:', error);
        alert('删除任务失败，请重试');
      }
    }
  }, [selectedPlan, deleteTask]);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: Task['status']) => {
    if (!selectedPlan) return;

    const taskToUpdate = selectedPlan.tasks.find(t => t.id === taskId);
    if (taskToUpdate) {
      try {
        const updatedTask: Task = { 
          ...taskToUpdate, 
          status: newStatus,
          updatedAt: new Date().toISOString() 
        };
        await updateTask(updatedTask);
      } catch (error) {
        console.error('更新任务状态失败:', error);
        alert('更新任务状态失败，请重试');
      }
    }
  }, [selectedPlan, updateTask]);

  const handleCancel = useCallback(() => {
    setShowCreateForm(false);
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      startDate: '',
      dueDate: ''
    });
  }, []);

  const getPriorityColor = useCallback((priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  }, []);

  const getPriorityText = useCallback((priority: Task['priority']) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '中';
    }
  }, []);

  const getStatusText = useCallback((status: Task['status']) => {
    switch (status) {
      case 'todo': return '待办';
      case 'in-progress': return '进行中';
      case 'completed': return '已完成';
      default: return '待办';
    }
  }, []);

  const getStatusClass = useCallback((status: Task['status']) => {
    switch (status) {
      case 'todo': return 'status-todo';
      case 'in-progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      default: return 'status-todo';
    }
  }, []);

  // 缓存任务统计信息
  const taskStats = useMemo(() => {
    if (!selectedPlan) return { total: 0, completed: 0, inProgress: 0, todo: 0 };
    
    const tasks = selectedPlan.tasks;
    return {
      total: tasks.length,
      completed: tasks.filter(task => task.status === 'completed').length,
      inProgress: tasks.filter(task => task.status === 'in-progress').length,
      todo: tasks.filter(task => task.status === 'todo').length
    };
  }, [selectedPlan]);

  // 缓存排序后的任务列表
  const sortedTasks = useMemo(() => {
    if (!selectedPlan) return [];
    
    return [...selectedPlan.tasks].sort((a, b) => {
      // 按状态排序：待办 > 进行中 > 已完成
      const statusOrder = { 'todo': 0, 'in-progress': 1, 'completed': 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      
      // 相同状态按优先级排序：高 > 中 > 低
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      // 最后按更新时间排序
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [selectedPlan]);

  if (!selectedPlan) {
    return (
      <div className="task-manager">
        <div className="page-header">
          <h2 className="page-title">任务管理</h2>
          <p className="page-description">请先选择一个计划来管理任务。</p>
        </div>
        
        <div className="empty-state">
          <p>请从计划管理页面选择一个计划，然后回到这里管理任务。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-manager">
      <div className="page-header">
        <h2 className="page-title">任务管理</h2>
        <p className="page-description">管理 "{selectedPlan.title}" 计划的任务</p>
      </div>

      {/* 任务统计 */}
      <div className="grid grid-4">
        <TaskStatCard 
          title="总任务数" 
          value={taskStats.total} 
          color="var(--primary-color)" 
        />
        <TaskStatCard 
          title="待办任务" 
          value={taskStats.todo} 
          color="var(--warning-color)" 
        />
        <TaskStatCard 
          title="进行中" 
          value={taskStats.inProgress} 
          color="var(--primary-color)" 
        />
        <TaskStatCard 
          title="已完成" 
          value={taskStats.completed} 
          color="var(--success-color)" 
        />
      </div>

      {/* 任务管理卡片 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">任务列表</h3>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            ➕ 添加任务
          </button>
        </div>

        {showCreateForm && (
          <TaskForm
            editingTask={editingTask}
            formData={formData}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}

        {selectedPlan.tasks.length === 0 ? (
          <div className="empty-state">
            <p>这个计划还没有任务。点击上方按钮添加第一个任务！</p>
          </div>
        ) : (
          <div className="task-list-container">
            {sortedTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                getPriorityColor={getPriorityColor}
                getPriorityText={getPriorityText}
                getStatusText={getStatusText}
                getStatusClass={getStatusClass}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 任务统计卡片组件
const TaskStatCard = memo(({ title, value, color }: { title: string; value: number; color: string }) => (
  <div className="card">
    <div className="metric-item">
      <div className="metric-value" style={{ color }}>{value}</div>
      <div className="metric-label">{title}</div>
    </div>
  </div>
));

// 任务表单组件
const TaskForm = memo(({ 
  editingTask, 
  formData, 
  onInputChange, 
  onSubmit, 
  onCancel 
}: {
  editingTask: Task | null;
  formData: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) => (
  <div className="create-form">
    <h4>{editingTask ? '编辑任务' : '添加新任务'}</h4>
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="title">任务标题 *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={onInputChange}
          required
          placeholder="输入任务标题"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">任务描述</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={onInputChange}
          rows={3}
          placeholder="描述任务的具体内容和要求"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="priority">优先级</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={onInputChange}
          >
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
            <option value="low">低优先级</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="status">状态</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={onInputChange}
          >
            <option value="todo">待办</option>
            <option value="in-progress">进行中</option>
            <option value="completed">已完成</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="startDate">开始日期</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={onInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="dueDate">截止日期</label>
          <input
            type="date"
            id="dueDate"
            name="dueDate"
            value={formData.dueDate}
            onChange={onInputChange}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {editingTask ? '更新任务' : '添加任务'}
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

// 任务卡片组件
const TaskCard = memo(({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  getPriorityColor, 
  getPriorityText, 
  getStatusText,
  getStatusClass
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  getPriorityColor: (priority: Task['priority']) => string;
  getPriorityText: (priority: Task['priority']) => string;
  getStatusText: (status: Task['status']) => string;
  getStatusClass: (status: Task['status']) => string;
}) => {
  const handleEdit = useCallback(() => onEdit(task), [onEdit, task]);
  const handleDelete = useCallback(() => onDelete(task.id), [onDelete, task.id]);
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(task.id, e.target.value as Task['status']);
  }, [onStatusChange, task.id]);

  const formattedDates = useMemo(() => ({
    start: task.startDate ? new Date(task.startDate).toLocaleDateString('zh-CN') : '',
    due: task.dueDate ? new Date(task.dueDate).toLocaleDateString('zh-CN') : ''
  }), [task.startDate, task.dueDate]);

  return (
    <div className={`task-card ${getStatusClass(task.status)}`}>
      <div className={`task-status-bar ${getStatusClass(task.status)}`}></div>
      <div className="task-card-main">
        <div className="task-card-header">
          <span className={`priority-badge ${getPriorityColor(task.priority)}`}>
            {getPriorityText(task.priority)}
          </span>
          <h4 className="task-card-title">{task.title}</h4>
        </div>
        <p className="task-card-description">{task.description}</p>
        {(task.startDate || task.dueDate) && (
          <div className="task-dates">
            {task.startDate && <div>开始: {formattedDates.start}</div>}
            {task.dueDate && <div>截止: {formattedDates.due}</div>}
          </div>
        )}
      </div>
      <div className="task-card-aside">
        <select 
          className="status-select"
          value={task.status}
          onChange={handleStatusChange}
        >
          <option value="todo">待办</option>
          <option value="in-progress">进行中</option>
          <option value="completed">已完成</option>
        </select>
        <div className="task-card-actions">
          <button 
            className="btn-icon"
            onClick={handleEdit}
            title="编辑"
          >
            ✏️
          </button>
          <button 
            className="btn-icon"
            onClick={handleDelete}
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
});

TaskManager.displayName = 'TaskManager';
TaskStatCard.displayName = 'TaskStatCard';
TaskForm.displayName = 'TaskForm';
TaskCard.displayName = 'TaskCard';

export default memo(TaskManager); 