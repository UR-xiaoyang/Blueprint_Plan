import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useOnlineMode } from '../hooks/useOnlineMode';
import { useDebugMode } from '../hooks/useDebugMode';

const Settings: React.FC = () => {
  const { themeMode, setThemeMode, schedule, setSchedule } = useTheme();
  const { 
    onlineMode, 
    setOnlineMode, 
    serverAddress, 
    setServerAddress, 
    localServerStatus,
    startLocalServer, 
    stopLocalServer 
  } = useOnlineMode();
  const { debugMode, setDebugMode } = useDebugMode();
  const [localServerAddress, setLocalServerAddress] = useState(serverAddress);
  const [localServerPort, setLocalServerPort] = useState<number | null>(null);

  const handleOnlineModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const mode = event.target.value as 'local' | 'cloud' | 'offline';
    setOnlineMode(mode);
    if (mode === 'local') {
      startLocalServer();
    }
    // 持久化保存（合并已存在设置）
    (async () => {
      if (window.ipcRenderer) {
        const current = await window.ipcRenderer.invoke('getSettings');
        await window.ipcRenderer.invoke('saveSettings', { ...current, onlineMode: mode });
      }
    })();
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

  const handleRestart = async () => {
    await stopLocalServer();
    // Add a delay to give the OS time to release the port
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    await startLocalServer();
  };

  const handleApplyServerAddress = () => {
    setServerAddress(localServerAddress);
    // 持久化保存（合并已存在设置）
    (async () => {
      if (window.ipcRenderer) {
        const current = await window.ipcRenderer.invoke('getSettings');
        await window.ipcRenderer.invoke('saveSettings', { ...current, serverAddress: localServerAddress });
      }
    })();
  };

  useEffect(() => {
    setLocalServerAddress(serverAddress);
  }, [serverAddress]);

  useEffect(() => {
    if (onlineMode === 'local' && localServerStatus === 'running') {
      window.electron.getServerPort().then(port => {
        if (port) {
          setLocalServerPort(port);
        }
      });
    } else {
      setLocalServerPort(null);
    }
  }, [onlineMode, localServerStatus]);

  // 初始化加载其他设置（在线模式、服务器地址、调试模式）
  useEffect(() => {
    (async () => {
      if (window.ipcRenderer) {
        const settings = await window.ipcRenderer.invoke('getSettings');
        if (settings.onlineMode) {
          setOnlineMode(settings.onlineMode);
        }
        if (settings.serverAddress) {
          setServerAddress(settings.serverAddress);
          setLocalServerAddress(settings.serverAddress);
        }
        if (typeof settings.debugMode === 'boolean') {
          setDebugMode(settings.debugMode);
        }
      }
    })();
  }, []);

  return (
    <div className="settings-view">
      <h2>设置</h2>
      
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
        <h3>在线模式</h3>
        <div className="setting-option">
          <label>
            <input
              type="radio"
              name="onlineMode"
              value="local"
              checked={onlineMode === 'local'}
              onChange={handleOnlineModeChange}
            />
            本地牵手服务器
            {onlineMode === 'local' && (
              <span className="server-status">
                {localServerStatus === 'running' && localServerPort && (
                  <span className="port-display">运行于端口: {localServerPort}</span>
                )}
                {localServerStatus === 'stopped' && (
                  <button onClick={handleRestart} className="restart-button">
                    重启
                  </button>
                )}
              </span>
            )}
          </label>
        </div>
        <div className="setting-option">
          <label>
            <input
              type="radio"
              name="onlineMode"
              value="cloud"
              checked={onlineMode === 'cloud'}
              onChange={handleOnlineModeChange}
            />
            在线
          </label>
          <label>
            本地牵手服务器
            {onlineMode === 'local' && (
              <span className="server-status">
                {localServerStatus === 'stopped' && (
                  <button onClick={handleRestart} className="restart-button">
                    重启
                  </button>
                )}
              </span>
            )}
          </label>
          <label>
            <input
              type="radio"
              value="offline"
              checked={onlineMode === 'offline'}
              onChange={handleOnlineModeChange}
            />
            离线
          </label>
        </div>
      </div>
      {onlineMode === 'cloud' && (
        <div className="setting-item">
          <label htmlFor="server-address">在线牵手服务器地址</label>
          <div className="server-address-input-container">
            <input
              type="text"
              id="server-address"
              value={localServerAddress}
              onChange={(e) => setLocalServerAddress(e.target.value)}
              placeholder="例如: ws://your-server.com:4444"
            />
            <button onClick={handleApplyServerAddress}>应用</button>
          </div>
        </div>
      )}
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
  );
};

export default Settings;