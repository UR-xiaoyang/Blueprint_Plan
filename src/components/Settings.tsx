import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useDebugMode } from '../hooks/useDebugMode';
import { aiService, AIConfig } from '../services/aiService';
import { RefreshCw, Moon, Palette, Keyboard, Cpu, ShieldAlert, Info, Settings as SettingsIcon } from 'lucide-react';

interface SettingsProps {
  showExtensions?: boolean;
  onShowExtensionsChange?: (show: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ showExtensions = false, onShowExtensionsChange }) => {
  const { themeMode, setThemeMode, schedule, setSchedule } = useTheme();
  const { debugMode, setDebugMode } = useDebugMode();
  const [realAppVersion, setRealAppVersion] = useState('');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [globalShortcut, setGlobalShortcut] = useState('');
  const [closeToTray, setCloseToTray] = useState(false);
  
  // AI Config State
  const [aiConfig, setAiConfig] = useState<AIConfig>(aiService.getConfig());
  const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const fetchModelList = async () => {
    setIsLoadingModels(true);
    try {
      const models = await aiService.fetchModels(aiConfig.provider);
      setAvailableModels(models);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTheme = event.target.value as 'light' | 'dark' | 'auto';
    setThemeMode(newTheme);
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSchedule(prev => ({ ...prev, [name]: value }));
  };

  const handleDebugModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setDebugMode(enabled);
    // 持久化保存（合并已存在设置）
    (async () => {
      if (window.ipcRenderer) {
        const current = await window.ipcRenderer.invoke('getSettings');
        await window.ipcRenderer.invoke('saveSettings', { ...current, debugMode: enabled });
      }
    })();
  };

  const handleAiConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'provider') {
      setAiConfig(prev => ({ ...prev, provider: value as any }));
      return;
    }

    setAiConfig(prev => {
      const provider = prev.provider;
      // update the specific provider config
      return {
        ...prev,
        [provider]: {
          ...(prev[provider] || {}),
          [name]: value
        }
      };
    });
  };

  const getCurrentProviderConfig = () => {
    return aiConfig[aiConfig.provider] || { apiKey: '', baseUrl: '', model: '' };
  };

  const currentConfig = getCurrentProviderConfig();

  const saveAiConfig = () => {
    aiService.saveConfig(aiConfig);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleShortcutKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.metaKey) keys.push('Super'); // Meta key (Windows/Command)
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');

    // Key code processing
    let key = e.key.toUpperCase();
    
    // Ignore pure modifier presses
    if (['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) {
      return;
    }
    
    // Normalize special keys
    const specialKeys: Record<string, string> = {
      ' ': 'Space',
      'ARROWUP': 'Up',
      'ARROWDOWN': 'Down',
      'ARROWLEFT': 'Left',
      'ARROWRIGHT': 'Right',
      'ESCAPE': 'Esc',
    };
    
    if (specialKeys[e.key]) {
      key = specialKeys[e.key];
    } else if (key.length === 1) {
      // For letters/numbers, keep uppercase
    } else {
      // For F1-F12, etc, use key as is but ensure first char cap? 
      // e.key is usually "F1", "Enter", "Backspace"
      // Electron accelerators are case insensitive mostly but standard is Title Case
      // Let's use e.key but handle modifiers
      // e.key for 'a' is 'a'. We want 'A'.
      if (e.key.length === 1) {
         key = e.key.toUpperCase();
      } else {
         key = e.key; // "F1", "Home", etc.
      }
    }

    // Add key to list
    keys.push(key);
    
    const shortcut = keys.join('+');
    setGlobalShortcut(shortcut);
    
    // Auto save
    (async () => {
      if (window.ipcRenderer) {
        const current = await window.ipcRenderer.invoke('getSettings');
        await window.ipcRenderer.invoke('saveSettings', { ...current, globalShortcut: shortcut });
      }
    })();
  };

  const clearShortcut = () => {
    setGlobalShortcut('');
    // Auto save empty (which might disable it or revert to default depending on backend logic? 
    // Backend uses || 'Alt+A', so clearing means reverting to default effectively unless we handle empty string explicitly.
    // Let's make it explicitly disable if empty? Or just reset to Alt+A?
    // User probably wants to disable or reset.
    // If we want to disable, we should send something specific or handle empty string in backend.
    // Currently backend: settings.globalShortcut || 'Alt+A'. So empty string -> 'Alt+A'.
    // If user wants to disable, that's a different feature.
    // For now, let's just allow changing it. If they clear, it resets to default visually?
    // Let's just set it to 'Alt+A' when cleared for clarity.
    const defaultShortcut = 'Alt+A';
    setGlobalShortcut(defaultShortcut);
    (async () => {
      if (window.ipcRenderer) {
        const current = await window.ipcRenderer.invoke('getSettings');
        await window.ipcRenderer.invoke('saveSettings', { ...current, globalShortcut: defaultShortcut });
      }
    })();
  };

  // 初始化加载其他设置（调试模式、快捷键、托盘）
  useEffect(() => {
    (async () => {
      if (window.ipcRenderer) {
        const settings = await window.ipcRenderer.invoke('getSettings');
        if (typeof settings.debugMode === 'boolean') {
          setDebugMode(settings.debugMode);
        }
        if (settings.globalShortcut) {
          setGlobalShortcut(settings.globalShortcut);
        } else {
          setGlobalShortcut('Alt+A'); // Default
        }
        if (typeof settings.closeToTray === 'boolean') {
          setCloseToTray(settings.closeToTray);
        }
      }
    })();
  }, []);

  // 自动获取程序版本
  useEffect(() => {
    (async () => {
      try {
        if (window.electron && typeof window.electron.getAppVersion === 'function') {
          const r = await window.electron.getAppVersion();
          if (r && r.ok && r.version) {
            setRealAppVersion(String(r.version));
          }
        }
      } catch (_) {}
    })();
  }, []);

  const handleCloseToTrayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setCloseToTray(enabled);
    (async () => {
      if (window.ipcRenderer) {
        const current = await window.ipcRenderer.invoke('getSettings');
        await window.ipcRenderer.invoke('saveSettings', { ...current, closeToTray: enabled });
      }
    })();
  };

  return (
    <div className="settings-view">
      
      <div className="setting-section">
        <h3>
          <Palette size={20} />
          外观设置
        </h3>
        <div className="setting-option">
          <label>
            <input 
              type="radio" 
              name="theme" 
              value="light" 
              checked={themeMode === 'light'} 
              onChange={handleThemeChange} 
            />
            关闭
          </label>
        </div>
        <div className="setting-option">
          <label>
            <input 
              type="radio" 
              name="theme" 
              value="dark" 
              checked={themeMode === 'dark'} 
              onChange={handleThemeChange} 
            />
            开启
          </label>
        </div>
        <div className="setting-option">
          <label>
            <input 
              type="radio" 
              name="theme" 
              value="auto" 
              checked={themeMode === 'auto'} 
              onChange={handleThemeChange} 
            />
            定时启动
          </label>
          {themeMode === 'auto' && (
            <div className="time-schedule">
              <label>
                从:
                <input 
                  type="time" 
                  name="start" 
                  value={schedule.start}
                  onChange={handleTimeChange} 
                />
              </label>
              <label>
                至:
                <input 
                  type="time" 
                  name="end" 
                  value={schedule.end}
                  onChange={handleTimeChange}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="setting-section">
        <h3>
          <SettingsIcon size={20} />
          常规设置
        </h3>
        <div className="setting-option">
          <label>
            <input 
              type="checkbox" 
              checked={closeToTray} 
              onChange={handleCloseToTrayChange} 
            />
            关闭主面板时最小化到系统托盘（后台运行）
          </label>
        </div>
      </div>

      <div className="setting-section">
        <h3>
          <Keyboard size={20} />
          全局快捷键
        </h3>
        <p className="setting-description" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          点击输入框并按下键盘组合键来设置唤醒/隐藏应用的快捷键。
        </p>
        <div className="setting-option" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={globalShortcut}
            onKeyDown={handleShortcutKeyDown}
            readOnly
            placeholder="按下快捷键 (例如 Alt+A)"
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              minWidth: '200px',
              textAlign: 'center',
              cursor: 'pointer'
            }}
          />
          <button 
            onClick={clearShortcut}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem' }}
          >
            重置默认
          </button>
        </div>
      </div>

      <div className="setting-section">
        <h3>AI 服务设置</h3>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>服务提供商</label>
          <select
            name="provider"
            value={aiConfig.provider}
            onChange={handleAiConfigChange}
            className="ai-select"
            style={{ 
              width: '100%', 
              padding: '0.5rem', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="openai">OpenAI</option>
            <option value="ollama">Ollama (本地)</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">自定义 (Compatible API)</option>
          </select>
        </div>

        <>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              API Key {aiConfig.provider === 'ollama' && <span style={{fontWeight: 'normal', fontSize: '0.9rem', opacity: 0.7}}>(Ollama 通常无需填写)</span>}
            </label>
            <input
              type="password"
              name="apiKey"
              value={currentConfig.apiKey}
              onChange={handleAiConfigChange}
              placeholder={aiConfig.provider === 'ollama' ? "ollama" : "sk-..."}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
            {aiConfig.provider === 'openrouter' && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                <a 
                  href="https://openrouter.ai/settings/keys" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: 'var(--primary-color)', textDecoration: 'none' }}
                >
                  获取 OpenRouter API Key &rarr;
                </a>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Base URL (可选)</label>
            <input
              type="text"
              name="baseUrl"
              value={currentConfig.baseUrl || ''}
              onChange={handleAiConfigChange}
              placeholder={
                aiConfig.provider === 'ollama' 
                  ? "http://localhost:11434/v1" 
                  : aiConfig.provider === 'openrouter'
                    ? "https://openrouter.ai/api/v1"
                    : "https://api.openai.com/v1"
              }
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 500 }}>
              <span>模型名称 (可选)</span>
              {aiConfig.provider === 'openrouter' && (
                <button 
                  onClick={fetchModelList}
                  disabled={isLoadingModels}
                  style={{ 
                    fontSize: '0.8rem', 
                    padding: '4px 8px', 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    background: 'var(--surface-color)',
                    color: 'var(--text-primary)'
                  }}
                  title="获取在线模型列表"
                >
                  <RefreshCw size={12} className={isLoadingModels ? "spin" : ""} />
                  {isLoadingModels ? '获取中...' : '获取列表'}
                </button>
              )}
            </label>
            <input
              type="text"
              name="model"
              value={currentConfig.model || ''}
              onChange={handleAiConfigChange}
              list={aiConfig.provider === 'openrouter' ? "model-list" : undefined}
              placeholder={
                aiConfig.provider === 'ollama' 
                  ? "llama3" 
                  : aiConfig.provider === 'openrouter'
                    ? "openai/gpt-3.5-turbo"
                    : "gpt-3.5-turbo"
              }
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
            {aiConfig.provider === 'openrouter' && (
              <datalist id="model-list">
                {availableModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </datalist>
            )}
          </div>
        </>
        
        <button 
          onClick={saveAiConfig}
          className="btn btn-primary"
          style={{ marginTop: '0.5rem' }}
        >
          保存 AI 配置
        </button>
      </div>

      <div className="setting-section">
        <h3>
          <ShieldAlert size={20} />
          高级设置
        </h3>
        <div className="setting-item">
          <label>启用 DLC 扩展功能</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={showExtensions}
              onChange={(e) => onShowExtensionsChange?.(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="setting-item">
          <label htmlFor="debug-mode">开启调试模式</label>
          <label className="switch">
            <input
              type="checkbox"
              id="debug-mode"
              checked={debugMode}
              onChange={handleDebugModeChange}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      <div className="setting-section">
        <h3>
          <Info size={20} />
          程序信息
        </h3>
        <div className="program-info-content">
          <div className="setting-item">
            <label>程序名称</label>
            <span>Blueprint Plan</span>
          </div>
          <div className="setting-item">
            <label>版本</label>
            <span>{realAppVersion || '未知'}</span>
          </div>
          <div className="setting-item">
            <label>调试模式</label>
            <span>{debugMode ? '开启' : '关闭'}</span>
          </div>
          <div className="setting-item" style={{alignItems: 'flex-start'}}>
            <label style={{whiteSpace: 'nowrap'}}>运行环境</label>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right', wordBreak: 'break-all', maxWidth: '60%' }}>
              {navigator.userAgent}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
