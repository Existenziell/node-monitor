import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { API_BASE_URL } from '@/constants';

export interface NotificationItem {
  id: string;
  message: string;
  type: string;
  createdAt: number;
  exiting?: boolean;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  addNotification: (opts: { message: string; type: string }) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const DISPLAY_MS = 5000;
const SLIDEOUT_MS = 350;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, exiting: true } : n))
    );
    const removeTimer = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, SLIDEOUT_MS);
    timeoutsRef.current.set(`remove-${id}`, removeTimer);
  }, []);

  const addNotification = useCallback(
    (opts: { message: string; type: string }) => {
      const id = crypto.randomUUID();
      const item: NotificationItem = {
        id,
        message: opts.message,
        type: opts.type,
        createdAt: Date.now(),
        exiting: false,
      };
      setNotifications((prev) => [item, ...prev]);
      const dismissTimer = setTimeout(() => dismissNotification(id), DISPLAY_MS);
      timeoutsRef.current.set(id, dismissTimer);
    },
    [dismissNotification]
  );

  useEffect(() => {
    if (typeof EventSource === 'undefined') {
      return;
    }
    const url = `${API_BASE_URL.replace(/\/$/, '')}/events`;
    const es = new EventSource(url);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type?: string;
          height?: number;
          mining_pool?: string;
        };
        if (data.type === 'new_block') {
          const pool = data.mining_pool?.trim();
          const msg = pool
            ? `Block #${data.height ?? '?'} found (${pool})`
            : `Block #${data.height ?? '?'} found`;
          addNotification({ message: msg, type: 'new_block' });
        }
      } catch {
        // ignore parse errors
      }
    };
    es.onerror = () => {
      es.close();
    };
    const timeouts = timeoutsRef.current;
    return () => {
      es.close();
      timeouts.forEach((t) => clearTimeout(t));
      timeouts.clear();
    };
  }, [addNotification]);

  const value: NotificationContextValue = {
    notifications,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
