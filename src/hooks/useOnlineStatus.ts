import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'app-online-status';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(() => {
    const storedStatus = localStorage.getItem(STORAGE_KEY);
    return storedStatus ? JSON.parse(storedStatus) : true; // Default to online
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(isOnline));
  }, [isOnline]);

  const toggleOnline = useCallback(() => {
    setIsOnline((prev: boolean) => !prev);
  }, []);

  return { isOnline, toggleOnline };
};
