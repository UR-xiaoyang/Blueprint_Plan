import React, { FC } from 'react';
import { Sparkles, Loader, Check, Calendar, ArrowRight, Lightbulb, RefreshCw, Trash2, MessageSquare, Send, History, X } from 'lucide-react';
import { useAIPlanStore } from '../hooks/useAIPlanStore';
import { aiService, AIPlanRequest } from '../services/aiService';
import { Plan } from '../App';
import '../styles/components.css';

interface AIPlanViewProps {
  initialPlan?: Plan | null;
  onPlanGenerated: (plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'progress'>) => void;
  onPlanUpdated?: (plan: Plan) => void;
  onCancel?: () => void;
}

const AIPlanView: FC<AIPlanViewProps> = ({ 
  initialPlan, 
  onPlanGenerated, 
  onPlanUpdated, 
  onCancel 
}) => {
  const { 
    step, setStep, 
    request, setRequest, 
    generatedPlan, setGeneratedPlan,
    chatInput, setChatInput,
    isModifying, setIsModifying,
    chatHistory, showChatHistory, toggleChatHistory, addChatMessage,
    reset,
    initializeWithPlan
  } = useAIPlanStore();

  React.useEffect(() => {
    if (initialPlan) {
      initializeWithPlan(initialPlan);
    }
  }, [initialPlan, initializeWithPlan]);

  const [streamingText, setStreamingText] = React.useState('');
  const presetDurations = ['1 week', '2 weeks', '1 month', '3 months', '6 months'] as const;
  const durationSelectValue = (presetDurations as readonly string[]).includes(request.duration || '') ? request.duration : 'custom';
  const [customDurationValue, setCustomDurationValue] = React.useState<number>(10);
  const [customDurationUnit, setCustomDurationUnit] = React.useState<'days' | 'weeks' | 'months'>('days');

  React.useEffect(() => {
    if ((presetDurations as readonly string[]).includes(request.duration || '')) return;
    const match = String(request.duration || '').trim().match(/^(\d+)\s*(day|days|week|weeks|month|months)$/i);
    if (!match) return;
    const value = parseInt(match[1], 10);
    const rawUnit = match[2].toLowerCase();
    const unit = rawUnit.startsWith('day') ? 'days' : rawUnit.startsWith('week') ? 'weeks' : 'months';
    if (!Number.isNaN(value) && value > 0) setCustomDurationValue(value);
    setCustomDurationUnit(unit);
  }, [request.duration]);

  const getPlanSignature = (plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'progress'>) => {
    return JSON.stringify({
      title: plan.title,
      description: plan.description,
      tasks: plan.tasks.map(t => ({
        title: t.title,
        description: t.description,
        startDate: t.startDate,
        dueDate: t.dueDate
      }))
    });
  };

  const handleGenerate = async () => {
    if (!request.goal.trim()) return;

    setStep('generating');
    setStreamingText('');
    try {
      const plan = await aiService.generatePlan(request, (chunk) => {
        setStreamingText(prev => prev + chunk);
      });
      setGeneratedPlan(plan);
      setStep('preview');
    } catch (error) {
      console.error('AI generation failed:', error);
      setStep('input');
    }
  };

  const handleModify = async () => {
    if (!chatInput.trim() || !generatedPlan) return;
    
    const userInstruction = chatInput;
    addChatMessage('user', userInstruction);

    setIsModifying(true);
    try {
      const beforeSig = getPlanSignature(generatedPlan);
      const updatedPlan = await aiService.modifyPlan(generatedPlan, userInstruction, (content) => {
        addChatMessage('assistant', content);
      });
      const afterSig = getPlanSignature(updatedPlan);

      setGeneratedPlan(updatedPlan);
      setChatInput('');

      if (beforeSig === afterSig) {
        addChatMessage('assistant', 'AI 返回结果未产生可见修改。请更具体描述要改的任务（例如：改第 2 个任务标题/日期，或明确要新增/删除的任务）。');
      } else {
        addChatMessage('assistant', '已根据您的指令完成了计划修改。');
      }
    } catch (error) {
      console.error('Modification failed:', error);
      addChatMessage('assistant', '修改失败，请重试。');
      if (window.appDialog) {
        await window.appDialog.alert('修改失败，请重试');
      }
    } finally {
      setIsModifying(false);
    }
  };

  const handleRegenerate = async () => {
    const ok = window.appDialog
      ? await window.appDialog.confirm('确定要重新生成吗？当前生成的计划将被覆盖。')
      : window.confirm('确定要重新生成吗？当前生成的计划将被覆盖。');
    if (ok) {
      await handleGenerate();
    }
  };

  const updatePlanTitle = (newTitle: string) => {
    if (generatedPlan) {
      setGeneratedPlan({ ...generatedPlan, title: newTitle });
    }
  };

  const updatePlanDesc = (newDesc: string) => {
    if (generatedPlan) {
      setGeneratedPlan({ ...generatedPlan, description: newDesc });
    }
  };

  const deleteTask = (index: number) => {
    if (generatedPlan) {
      const newTasks = [...generatedPlan.tasks];
      newTasks.splice(index, 1);
      setGeneratedPlan({ ...generatedPlan, tasks: newTasks });
    }
  };

  const handleConfirm = async () => {
    if (generatedPlan) {
      if (initialPlan && onPlanUpdated) {
        // Update existing plan
        onPlanUpdated({
          ...initialPlan,
          title: generatedPlan.title,
          description: generatedPlan.description,
          tasks: generatedPlan.tasks,
          startDate: generatedPlan.startDate,
          endDate: generatedPlan.endDate,
          // Keep other fields like id, createdAt, progress (or maybe progress should be reset? No, keep it)
          updatedAt: new Date().toISOString()
        });
         if (window.appDialog) {
          await window.appDialog.alert('计划已成功更新！');
        }
      } else {
        // Create new plan
        onPlanGenerated(generatedPlan);
        if (window.appDialog) {
          await window.appDialog.alert('计划已成功生成并添加到您的计划列表中！');
        }
      }
      // Reset after success
      reset();
    }
  };

  return (
    <div className="ai-plan-view">
      <div className="ai-view-header">
        <h1>
          <Sparkles className="icon-pulse" size={28} style={{ color: 'var(--accent-color)', marginRight: '12px' }} />
          AI 智能计划生成
        </h1>
        <p>输入您的目标，AI 助手将为您量身定制详细的执行计划和任务清单。</p>
      </div>

      <div className="ai-view-content">
        {step === 'input' && (
          <div className="ai-input-card fade-in">
            <div className="form-group">
              <label className="large-label">我想实现的目标是...</label>
              <textarea 
                className="ai-textarea"
                rows={4} 
                placeholder="例如：在一个月内掌握 React Native 开发，或者 准备一场马拉松比赛..."
                value={request.goal}
                onChange={(e) => setRequest({ ...request, goal: e.target.value })}
                autoFocus
              />
            </div>

            <div className="form-row" style={{ marginTop: '1.5rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>预计耗时</label>
                <div className="select-wrapper">
                  <select 
                    value={durationSelectValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'custom') {
                        setRequest({ ...request, duration: `${customDurationValue} ${customDurationUnit}` });
                        return;
                      }
                      setRequest({ ...request, duration: value });
                    }}
                    className="ai-select"
                  >
                    <option value="1 week">1 周 - 短期冲刺</option>
                    <option value="2 weeks">2 周 - 强化训练</option>
                    <option value="1 month">1 个月 - 标准周期</option>
                    <option value="3 months">3 个月 - 长期规划</option>
                    <option value="6 months">半年 - 深度学习</option>
                    <option value="custom">自定义...</option>
                  </select>
                </div>
                {durationSelectValue === 'custom' && (
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      className="ai-select"
                      value={customDurationValue}
                      onChange={(e) => {
                        const next = Math.max(1, parseInt(e.target.value || '1', 10));
                        setCustomDurationValue(next);
                        setRequest({ ...request, duration: `${next} ${customDurationUnit}` });
                      }}
                      style={{ flex: 1 }}
                    />
                    <div className="select-wrapper" style={{ flex: 1 }}>
                      <select
                        className="ai-select"
                        value={customDurationUnit}
                        onChange={(e) => {
                          const nextUnit = e.target.value as 'days' | 'weeks' | 'months';
                          setCustomDurationUnit(nextUnit);
                          setRequest({ ...request, duration: `${customDurationValue} ${nextUnit}` });
                        }}
                      >
                        <option value="days">天</option>
                        <option value="weeks">周</option>
                        <option value="months">月</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>强度偏好</label>
                <div className="select-wrapper">
                   <select 
                      value={request.intensity} 
                      onChange={(e) => setRequest({ ...request, intensity: e.target.value as any })}
                      className="ai-select"
                    >
                      <option value="low">轻松 - 循序渐进</option>
                      <option value="medium">适中 - 平衡生活</option>
                      <option value="high">高强度 - 全力以赴</option>
                    </select>
                </div>
              </div>
            </div>

            <div className="ai-tips">
              <Lightbulb size={16} />
              <span>提示：目标描述越具体，生成的计划越精准。尝试包含具体的技能点或量化指标。</span>
            </div>

            <div className="ai-actions-large">
              <button 
                className="btn btn-primary btn-xl" 
                onClick={handleGenerate}
                disabled={!request.goal.trim()}
              >
                <Sparkles size={20} /> 生成我的计划
              </button>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="ai-generating-view fade-in">
            <div className="loader-container">
               <Loader className="icon-spin" size={64} style={{ color: 'var(--accent-color)' }} />
            </div>
            <h3>正在为您规划...</h3>
            <p>AI 正在分析 "{request.goal}" 并拆解关键任务节点</p>
            <div className="generating-steps">
               <div className="step-item active">分析目标需求</div>
               <div className="step-item active">构建时间轴</div>
               <div className="step-item active">生成具体任务</div>
               <div className="step-item">优化执行建议</div>
            </div>
            
            {streamingText && (
              <div className="streaming-output">
                <div className="streaming-header">
                  <div className="terminal-dot red"></div>
                  <div className="terminal-dot yellow"></div>
                  <div className="terminal-dot green"></div>
                  <span>AI Thinking Process</span>
                </div>
                <pre>{streamingText}</pre>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && generatedPlan && (
          <div className="ai-preview-view fade-in">
            <div className="preview-card">
              <div className="preview-header-large">
                <div className="header-content">
                   <input 
                     className="editable-title" 
                     value={generatedPlan.title} 
                     onChange={(e) => updatePlanTitle(e.target.value)}
                     placeholder="计划标题"
                   />
                   <textarea 
                     className="editable-desc" 
                     value={generatedPlan.description} 
                     onChange={(e) => updatePlanDesc(e.target.value)}
                     placeholder="计划描述"
                     rows={2}
                   />
                </div>
                <div className="header-meta">
                  <div className="meta-tag"><Calendar size={14} /> {generatedPlan.startDate} - {generatedPlan.endDate}</div>
                  <div className="meta-tag">{generatedPlan.tasks.length} 个任务节点</div>
                </div>
              </div>

              <div className="preview-body">
                <h4>任务路线图</h4>
                <div className="timeline-list">
                  {generatedPlan.tasks.map((task, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <div className="timeline-date">{task.startDate.slice(5)}</div>
                        <div className="timeline-card">
                          <div className="card-header-row">
                            <strong>{task.title}</strong>
                            <button 
                              className="btn-icon-danger" 
                              onClick={() => deleteTask(idx)}
                              title="删除此任务"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p>{task.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="preview-chat-section">
                {showChatHistory && (
                  <div className="chat-history-panel fade-in">
                    <div className="chat-history-header">
                      <span>修改记录</span>
                      <button className="btn-icon-ghost" onClick={toggleChatHistory}><X size={16} /></button>
                    </div>
                    <div className="chat-history-list">
                      {chatHistory.length === 0 ? (
                        <div className="empty-history">暂无修改记录</div>
                      ) : (
                        chatHistory.map(msg => (
                          <div key={msg.id} className={`chat-message ${msg.role}`}>
                            <div className="message-content">{msg.content}</div>
                            <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="chat-input-wrapper">
                  <button 
                    className={`btn-icon-secondary ${showChatHistory ? 'active' : ''}`}
                    onClick={toggleChatHistory}
                    title={showChatHistory ? "隐藏记录" : "显示记录"}
                    style={{ marginRight: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    <History size={20} />
                  </button>
                  <MessageSquare size={20} className="chat-icon" />
                  <input
                    type="text"
                    className="chat-input"
                    placeholder="告诉 AI 如何调整计划... (例如：把第一周的任务强度降低，或者增加一个关于测试的任务)"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleModify()}
                    disabled={isModifying}
                  />
                  <button 
                    className="btn-icon-primary"
                    onClick={handleModify}
                    disabled={!chatInput.trim() || isModifying}
                    title="发送指令"
                  >
                    {isModifying ? <Loader size={18} className="icon-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>

              <div className="preview-footer">
                <div className="footer-tip">
                  <Lightbulb size={14} />
                  <span>您可以直接编辑标题、描述或删除任务</span>
                </div>
                <div className="footer-actions">
                  <button className="btn btn-secondary btn-lg" onClick={handleRegenerate}>
                    <RefreshCw size={16} /> 重新生成
                  </button>
                  <button className="btn btn-secondary btn-lg" onClick={() => {
                    if (initialPlan && onCancel) {
                      onCancel();
                      reset();
                    } else {
                      setStep('input');
                    }
                  }}>
                     {initialPlan ? '取消修改' : '返回修改'}
                  </button>
                  <button className="btn btn-primary btn-lg" onClick={handleConfirm}>
                    <Check size={20} /> {initialPlan ? '保存修改' : '确认创建'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .ai-plan-view {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 2rem;
          overflow-y: auto;
          background: var(--bg-primary);
        }
        
        .ai-view-header {
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .ai-view-header h1 {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        
        .ai-view-header p {
          color: var(--text-secondary);
          font-size: 1.1rem;
        }
        
        .ai-view-content {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          flex: 1;
        }
        
        .ai-input-card {
          background: var(--bg-secondary);
          padding: 2rem;
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
        }
        
        .large-label {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 1rem;
          display: block;
        }
        
        .ai-textarea {
          width: 100%;
          padding: 1rem;
          font-size: 1.1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-primary);
          resize: vertical;
          min-height: 120px;
        }
        
        .ai-select {
          width: 100%;
          padding: 0.8rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 1rem;
        }
        
        .ai-tips {
          display: flex;
          gap: 0.8rem;
          margin: 1.5rem 0;
          padding: 1rem;
          background: rgba(var(--accent-rgb), 0.1);
          border-radius: var(--radius-md);
          color: var(--accent-color);
          font-size: 0.9rem;
          align-items: flex-start;
        }
        
        .ai-actions-large {
          margin-top: 2rem;
          display: flex;
          justify-content: center;
        }
        
        .btn-xl {
          padding: 1rem 3rem;
          font-size: 1.2rem;
          border-radius: 50px;
        }
        
        .ai-generating-view {
          text-align: center;
          padding: 4rem 0;
        }
        
        .generating-steps {
          margin-top: 2rem;
          display: flex;
          justify-content: center;
          gap: 1rem;
        }
        
        .step-item {
          font-size: 0.9rem;
          color: var(--text-secondary);
          opacity: 0.5;
        }
        
        .step-item.active {
          opacity: 1;
          color: var(--accent-color);
          font-weight: 500;
        }
        
        .preview-card {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        .preview-header-large {
          padding: 2rem;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-color);
        }

        .editable-title {
          font-size: 1.8rem;
          font-weight: bold;
          color: var(--text-primary);
          background: transparent;
          border: 1px solid transparent;
          width: 100%;
          margin-bottom: 0.5rem;
          border-radius: var(--radius-sm);
          padding: 0.2rem 0.5rem;
          margin-left: -0.5rem;
        }

        .editable-title:focus {
          border-color: var(--accent-color);
          outline: none;
          background: var(--bg-primary);
        }

        .editable-desc {
          font-size: 1.1rem;
          color: var(--text-secondary);
          background: transparent;
          border: 1px solid transparent;
          width: 100%;
          font-family: inherit;
          resize: none;
          border-radius: var(--radius-sm);
          padding: 0.2rem 0.5rem;
          margin-left: -0.5rem;
        }

        .editable-desc:focus {
          border-color: var(--accent-color);
          outline: none;
          background: var(--bg-primary);
        }
        
        .header-content h2 {
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
        }
        
        .header-meta {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .meta-tag {
          background: var(--bg-primary);
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .preview-body {
          padding: 2rem;
        }
        
        .timeline-list {
          margin-top: 1.5rem;
          position: relative;
        }
        
        .timeline-list::before {
          content: '';
          position: absolute;
          left: 7px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--border-color);
        }
        
        .timeline-item {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          position: relative;
        }
        
        .timeline-marker {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent-color);
          border: 3px solid var(--bg-secondary);
          z-index: 1;
          flex-shrink: 0;
        }
        
        .timeline-content {
          flex: 1;
        }
        
        .timeline-date {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.3rem;
        }
        
        .timeline-card {
          background: var(--bg-primary);
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .btn-icon-danger {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          opacity: 0.6;
          transition: all 0.2s;
        }

        .btn-icon-danger:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          opacity: 1;
        }
        
        .chat-input-wrapper {
          display: flex;
          align-items: center;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 50px;
          padding: 0.8rem 1.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transition: all 0.2s;
        }

        .chat-input-wrapper:focus-within {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
        }

        .chat-icon {
          color: var(--text-secondary);
          margin-right: 1rem;
          min-width: 24px;
        }

        .chat-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 1.1rem;
          color: var(--text-primary);
          outline: none;
          min-height: 28px;
        }

        .btn-icon-primary {
          background: var(--accent-color);
          color: white;
          border: none;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: 0.8rem;
          flex-shrink: 0;
        }

        .preview-footer {
          padding: 1.5rem 2rem;
          background: var(--bg-tertiary);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .footer-tip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .footer-actions {
          display: flex;
          gap: 1rem;
        }
        
        .btn-lg {
          padding: 0.8rem 1.5rem;
          font-size: 1rem;
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .streaming-output {
          margin-top: 2rem;
          background: #1e1e1e;
          border-radius: var(--radius-md);
          overflow: hidden;
          text-align: left;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          border: 1px solid #333;
        }

        .streaming-header {
          background: #2d2d2d;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1px solid #333;
        }

        .terminal-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .terminal-dot.red { background: #ff5f56; }
        .terminal-dot.yellow { background: #ffbd2e; }
        .terminal-dot.green { background: #27c93f; }

        .streaming-header span {
          margin-left: 0.5rem;
          color: #999;
          font-size: 0.8rem;
          font-family: monospace;
        }

        .streaming-output pre {
          padding: 1rem;
          margin: 0;
          color: #e0e0e0;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 0.9rem;
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 300px;
          overflow-y: auto;
        }

        .chat-history-panel {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          margin-bottom: 1rem;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .chat-history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.8rem 1rem;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-color);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .chat-history-list {
          padding: 1rem;
          max-height: 300px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .empty-history {
          text-align: center;
          color: var(--text-secondary);
          font-size: 0.9rem;
          padding: 2rem 0;
        }

        .chat-message {
          max-width: 80%;
          padding: 0.8rem;
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          line-height: 1.4;
        }

        .chat-message.user {
          align-self: flex-end;
          background: rgba(var(--accent-rgb), 0.1);
          border: 1px solid rgba(var(--accent-rgb), 0.2);
          color: var(--text-primary);
        }

        .chat-message.assistant {
          align-self: flex-start;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
        }

        .message-time {
          font-size: 0.75rem;
          opacity: 0.6;
          margin-top: 0.4rem;
          text-align: right;
        }

        .btn-icon-ghost {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-icon-ghost:hover {
          background: rgba(0,0,0,0.05);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};

export default AIPlanView;
