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
const CHAIN_TIP_POLL_MS = 5000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastSeenHeightRef = useRef<number | null>(null);

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
      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
    let isMounted = true;
    const chainTipUrl = `${API_BASE_URL.replace(/\/$/, '')}/chain-tip`;
    const pollChainTip = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const isNode =
        typeof process !== 'undefined' && process.versions?.node !== undefined && process.versions?.node !== null;
      const init: RequestInit = { cache: 'no-store' };
      if (!isNode) {
        init.signal = controller.signal;
      }
      try {
        const res = await fetch(chainTipUrl, init);
        if (!res.ok) return;
        const payload = (await res.json()) as {
          data?: {
            height?: number | null;
            mining_pool?: string | null;
          };
        };
        const height = payload?.data?.height;
        const previousHeight = lastSeenHeightRef.current;
        if (!Number.isInteger(height)) return;
        if (!isMounted) return;
        const currentHeight = height as number;
        lastSeenHeightRef.current = currentHeight;
        if (previousHeight === null || currentHeight <= previousHeight) return;
        const pool = payload?.data?.mining_pool?.trim();
        const msg = pool
          ? `Block #${currentHeight} found (${pool})`
          : `Block #${currentHeight} found`;
        addNotification({ message: msg, type: 'new_block' });
        (['blocks', 'network', 'node'] as const).forEach((tabId) => {
          window.dispatchEvent(new CustomEvent('tab-refresh', { detail: tabId }));
        });
      } catch {
        // Poll error is non-fatal; next interval will retry
      } finally {
        clearTimeout(timeoutId);
      }
    };
    pollChainTip().catch(() => {});
    const pollId = setInterval(() => {
      pollChainTip().catch(() => {});
    }, CHAIN_TIP_POLL_MS);
    return () => {
      isMounted = false;
      clearInterval(pollId);
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
