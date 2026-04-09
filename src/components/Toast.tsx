import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle2 className="text-red-500" size={20} />,
    error: <AlertCircle className="text-red-500" size={20} />,
    info: <Info className="text-purple-500" size={20} />,
  };

  const bgColors = {
    success: 'bg-red-50 border-red-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-purple-50 border-purple-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl ${bgColors[type]} min-w-[280px] max-w-[90vw]`}
    >
      <div className="shrink-0">{icons[type]}</div>
      <p className="text-sm font-bold text-gray-800 flex-grow">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
        <X size={16} className="text-gray-400" />
      </button>
    </motion.div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = "Tak",
  cancelText = "Anuluj"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-cyan-600" size={32} />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h3>
          <p className="text-gray-600 font-medium">{message}</p>
        </div>
        <div className="flex border-t border-gray-100">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 transition-colors border-r border-gray-100"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-4 text-red-600 font-bold hover:bg-red-50 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
