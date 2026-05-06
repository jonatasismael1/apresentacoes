import { createContext, useContext } from 'react';
import type { ToastMessage } from '../types';

export interface ToastContextType {
  showToast: (message: string, type: ToastMessage['type']) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
