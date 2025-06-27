import { useEffect, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationProps {
  message: string;
  type: NotificationType;
  duration?: number;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  duration = 3000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // 等待动画完成
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`notification ${type}`}>
      {message}
    </div>
  );
};

// 通知管理Hook
export interface NotificationState {
  id: string;
  message: string;
  type: NotificationType;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);

  const addNotification = (message: string, type: NotificationType) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const showSuccess = (message: string) => addNotification(message, 'success');
  const showError = (message: string) => addNotification(message, 'error');
  const showInfo = (message: string) => addNotification(message, 'info');

  return {
    notifications,
    showSuccess,
    showError,
    showInfo,
    removeNotification
  };
};

// 通知容器组件
export interface NotificationContainerProps {
  notifications: NotificationState[];
  onRemove: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove
}) => {
  return (
    <>
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </>
  );
}; 