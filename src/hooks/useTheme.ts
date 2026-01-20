import { useState, useEffect, useCallback } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeSchedule {
  start: string; // HH:mm
  end: string;   // HH:mm
}

const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

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
      if (Capacitor.isNativePlatform()) {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {}); // Light text (white) for dark bg
      }
    } else {
      document.documentElement.classList.remove('dark-mode');
      if (Capacitor.isNativePlatform()) {
        StatusBar.setStyle({ style: Style.Light }).catch(() => {}); // Dark text (black) for light bg
      }
    }

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