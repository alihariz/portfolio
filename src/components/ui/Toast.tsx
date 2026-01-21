import React, { useEffect } from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onClose,
  duration = 5000
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <FiAlertCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <FiInfo className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div
      className={`fixed top-20 right-4 z-50 max-w-md w-full sm:w-auto animate-slide-in-right`}
      role="alert"
      aria-live="polite"
    >
      <div className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${getStyles()}`}>
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <p className="flex-1 text-sm text-text-primary-light dark:text-text-primary-dark font-medium">
          {message}
        </p>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
          aria-label="Close notification"
        >
          <FiX className="h-4 w-4 text-text-secondary-light dark:text-text-secondary-dark" />
        </button>
      </div>
    </div>
  );
};
