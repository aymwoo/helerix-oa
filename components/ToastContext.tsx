'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const value = {
    toast: addToast,
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
    warning: (msg: string) => addToast(msg, 'warning')
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto min-w-[300px] max-w-sm px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in slide-in-from-right-full fade-in duration-300 ${
              t.type === 'success' ? 'bg-white border-green-200 text-green-800' :
              t.type === 'error' ? 'bg-white border-red-200 text-red-800' :
              t.type === 'warning' ? 'bg-white border-amber-200 text-amber-800' :
              'bg-white border-gray-200 text-gray-800'
            }`}
          >
            <span className={`material-symbols-outlined text-xl ${
               t.type === 'success' ? 'text-green-500' :
               t.type === 'error' ? 'text-red-500' :
               t.type === 'warning' ? 'text-amber-500' :
               'text-gray-500'
            }`}>
              {t.type === 'success' ? 'check_circle' :
               t.type === 'error' ? 'error' :
               t.type === 'warning' ? 'warning' :
               'info'}
            </span>
            <p className="text-sm font-semibold">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};
