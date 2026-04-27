import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ToastState {
  message: string;
  visible: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });

  const showToast = useCallback((message: string, duration = 2000) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), duration);
  }, []);

  return { toast, showToast };
}

export function Toast({ toast }: { toast: ToastState }) {
  return (
    <AnimatePresence>
      {toast.visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg z-50 pointer-events-none"
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
