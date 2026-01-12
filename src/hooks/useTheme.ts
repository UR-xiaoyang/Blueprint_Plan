import { useState, useEffect, useCallback } from 'react';
import { registerPlugin } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// 定义 NavigationBar 插件接口
interface NavigationBarPlugin {
  setColor(options: { color: string; darkButtons?: boolean }): Promise<void>;
}

const NavigationBar = registerPlugin<NavigationBarPlugin>('NavigationBar');

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeSchedule {
  start: string; // HH:mm
  end: string;   // HH:mm
}

const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// 更新 Android 状态栏和导航栏颜色
const updateAndroidTheme = async (isDark: boolean) => {
  try {
    if (isDark) {
      await StatusBar.setStyle({ style: Style.Dark });
      // Set to black
      await StatusBar.setBackgroundColor({ color: '#000000' });
      await NavigationBar.setColor({ color: '#000000', darkButtons: false });
    } else {
      // User requested black status bar even in light mode
      await StatusBar.setStyle({ style: Style.Dark });
      // Set to black
      await StatusBar.setBackgroundColor({ color: '#000000' });
      await NavigationBar.setColor({ color: '#FFFFFF', darkButtons: true });
    }
  } catch (e) {
    // 忽略在非 Android 环境下的错误，或者插件未加载的错误
    console.warn('Failed to set Android theme:', e);
  }
};

export const useTheme = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [schedule, setSchedule] = useState<ThemeSchedule>({ start: '22:00', end: '07:00' });

  useEffect(() => {
    const loadSettings = async () => {
      if (window.ipcRenderer) {
        const settings = await window.ipcRenderer.invoke('getSettings');
        if (settings.themeMode) {
          setThemeMode(settings.themeMode);
        }
        if (settings.schedule) {
          setSchedule(settings.schedule);
        }
      } else {
        // Fallback for Web/Android
        try {
          const stored = localStorage.getItem('app_settings');
          if (stored) {
            const settings = JSON.parse(stored);
            if (settings.themeMode) setThemeMode(settings.themeMode);
            if (settings.schedule) setSchedule(settings.schedule);
          }
        } catch (e) {
          console.error('Failed to load settings from localStorage', e);
        }
      }
    };
    loadSettings();
  }, []);

  const applyTheme = useCallback(() => {
    let isDark = false;
    if (themeMode === 'auto') {
      const now = new Date();
      const startTime = new Date();
      const [startHour, startMinute] = schedule.start.split(':').map(Number);
      startTime.setHours(startHour, startMinute, 0, 0);

      const endTime = new Date();
      const [endHour, endMinute] = schedule.end.split(':').map(Number);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      if (startTime > endTime) { // Overnight schedule
        if (now >= startTime || now < endTime) {
          isDark = true;
        }
      } else { // Same-day schedule
        if (now >= startTime && now < endTime) {
          isDark = true;
        }
      }
    } else if (themeMode === 'dark') {
      isDark = true;
    }

    if (isDark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }

    // 同步到 Android 原生层
    updateAndroidTheme(isDark);

  }, [themeMode, schedule]);

  useEffect(() => {
    const saveSettings = async () => {
      if (window.ipcRenderer) {
        const current = await window.ipcRenderer.invoke('getSettings');
        await window.ipcRenderer.invoke('saveSettings', { ...current, themeMode, schedule });
      } else {
        // Fallback for Web/Android
        try {
          const settings = { themeMode, schedule };
          localStorage.setItem('app_settings', JSON.stringify(settings));
        } catch (e) {
          console.error('Failed to save settings to localStorage', e);
        }
      }
    };
    saveSettings();
    applyTheme();

    if (themeMode === 'auto') {
      const interval = setInterval(applyTheme, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [themeMode, schedule, applyTheme]);

  return { themeMode, setThemeMode, schedule, setSchedule };
};