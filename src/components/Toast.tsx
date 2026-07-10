import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, AlertCircle, Info } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => {
            let Icon = Info;
            let borderStyle = "border-black/20";
            let textStyle = "text-black";
            let bgStyle = "bg-[#f5f3f0]";
            
            if (toast.type === 'success') {
              Icon = Check;
              borderStyle = "border-black";
              bgStyle = "bg-black text-white";
              textStyle = "text-white";
            } else if (toast.type === 'error') {
              Icon = AlertCircle;
              borderStyle = "border-red-600";
              bgStyle = "bg-red-50 text-red-900";
              textStyle = "text-red-900";
            }

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
                className={`pointer-events-auto flex items-start gap-3 p-4 shadow-md border ${borderStyle} ${bgStyle} rounded-none relative overflow-hidden`}
              >
                {/* Visual Icon Accent */}
                <div className="shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                
                {/* Content */}
                <div className="flex-1 text-left">
                  <p className={`text-xs font-mono font-bold leading-relaxed ${textStyle}`}>
                    {toast.message}
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={() => removeToast(toast.id)}
                  className={`shrink-0 p-0.5 transition-colors cursor-pointer rounded-none ${
                    toast.type === 'success' 
                      ? 'text-zinc-400 hover:text-white' 
                      : 'text-zinc-400 hover:text-black'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
