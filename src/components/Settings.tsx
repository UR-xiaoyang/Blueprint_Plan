import React from 'react';
import { useTheme } from '../hooks/useTheme';

const Settings: React.FC = () => {
  const { themeMode, setThemeMode, schedule, setSchedule } = useTheme();

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setThemeMode(event.target.value as typeof themeMode);
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSchedule({
      ...schedule,
      [event.target.name]: event.target.value,
    });
  };

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
    </div>
  );
};

export default Settings; 