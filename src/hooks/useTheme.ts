import { useState, useEffect, useCallback } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeSchedule {
  start: string; // HH:mm
  end: string;   // HH:mm
}

const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const useTheme = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('themeMode') as ThemeMode) || 'light';
  });
  
  const [schedule, setSchedule] = useState<ThemeSchedule>(() => {
    const savedSchedule = localStorage.getItem('themeSchedule');
    return savedSchedule ? JSON.parse(savedSchedule) : { start: '22:00', end: '07:00' };
  });

  const applyTheme = useCallback(() => {
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
          document.documentElement.classList.add('dark-mode');
        } else {
          document.documentElement.classList.remove('dark-mode');
        }
      } else { // Same-day schedule
        if (now >= startTime && now < endTime) {
          document.documentElement.classList.add('dark-mode');
        } else {
          document.documentElement.classList.remove('dark-mode');
        }
      }
    } else if (themeMode === 'dark') {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [themeMode, schedule]);

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
    localStorage.setItem('themeSchedule', JSON.stringify(schedule));
    applyTheme();

    if (themeMode === 'auto') {
      const interval = setInterval(applyTheme, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [themeMode, schedule, applyTheme]);

  return { themeMode, setThemeMode, schedule, setSchedule };
}; 