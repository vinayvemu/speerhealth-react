import { createContext, useCallback, useContext, useState } from 'react';
import { Snackbar, Alert, type AlertColor } from '@mui/material';

interface Toast {
  id: number;
  message: string;
  severity: AlertColor;
}

interface ToastContextValue {
  toast: (message: string, severity?: AlertColor) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, severity: AlertColor = 'info') => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, severity }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.map((t, i) => (
        <Snackbar
          key={t.id}
          open
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 80 + i * 56, sm: 24 + i * 56 } }}
        >
          <Alert severity={t.severity} variant="filled" sx={{ minWidth: 280 }}>
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
