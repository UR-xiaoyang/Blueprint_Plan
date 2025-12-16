import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useDebugMode } from '../hooks/useDebugMode';

const Settings: React.FC = () => {
  const { themeMode, setThemeMode, schedule, setSchedule } = useTheme();
  const { debugMode, setDebugMode } = useDebugMode();
  const [realAppVersion, setRealAppVersion] = useState('');
  const [showProgramInfo, setShowProgramInfo] = useState(false);

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

  // 初始化加载其他设置（调试模式）
  useEffect(() => {
    (async () => {
      if (window.ipcRenderer) {
        const settings = await window.ipcRenderer.invoke('getSettings');
        if (typeof settings.debugMode === 'boolean') {
          setDebugMode(settings.debugMode);
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

  return (
    <div className="settings-view">
      
      <div className="setting-section">
        <h3>夜间模式</h3>
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
        <h3>其他设置</h3>
        <div className="setting-item">
          <label htmlFor="debug-mode">
            <input
              type="checkbox"
              id="debug-mode"
              checked={debugMode}
              onChange={handleDebugModeChange}
            />
            开启调试模式
          </label>
        </div>
      </div>

      <div className="setting-section">
        <h3>程序信息</h3>
        <button onClick={async () => {
          try {
            if (window.electron && typeof window.electron.getAppVersion === 'function') {
              const r = await window.electron.getAppVersion();
              if (r && r.ok && r.version) {
                setRealAppVersion(String(r.version));
              }
            }
          } catch (_) {}
          setShowProgramInfo(true);
        }}>查看程序信息</button>
        {showProgramInfo && (
          <div className="program-info-modal" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: '#fff',
              padding: '16px 20px',
              borderRadius: 8,
              width: 'min(520px, 90vw)',
              boxShadow: '0 10px 24px rgba(0,0,0,0.2)'
            }}>
              <h4 style={{ marginTop: 0 }}>Blueprint Plan 程序信息</h4>
              <div style={{ lineHeight: 1.8 }}>
                <div><strong>程序名称：</strong>Blueprint Plan</div>
                <div><strong>版本：</strong>{realAppVersion || '未知'}</div>
                <div><strong>调试模式：</strong>{debugMode ? '开启' : '关闭'}</div>
                <div><strong>运行环境：</strong>{navigator.userAgent}</div>
              </div>
              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <button onClick={() => setShowProgramInfo(false)}>关闭</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;