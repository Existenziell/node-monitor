import React, { createContext, useContext, useCallback, useRef } from 'react';
import { MAX_CONSOLE_LINES } from '@/constants';
import type { ConsoleContextValue, ConsoleLine, LogType } from '@/types';

export type { ConsoleLine, LogType } from '@/types';

const ConsoleContext = createContext<ConsoleContextValue | null>(null);

export function ConsoleProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<ConsoleLine[]>([]);
  const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'disconnected'>('disconnected');
  const idRef = useRef(0);

  const log = useCallback((message: string, type: LogType = 'info') => {
    const id = ++idRef.current;
    const timestamp = new Date().toLocaleTimeString();
    setLines((prev) => {
      const next = [...prev, { id, timestamp, message, type }];
      return next.length > MAX_CONSOLE_LINES ? next.slice(-MAX_CONSOLE_LINES) : next;
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value: ConsoleContextValue = {
    lines,
    log,
    clear,
    connectionStatus,
    setConnectionStatus,
  };

  return <ConsoleContext.Provider value={value}>{children}</ConsoleContext.Provider>;
}

export function useConsole(): ConsoleContextValue {
  const ctx = useContext(ConsoleContext);
  if (!ctx) {
    throw new Error('useConsole must be used within ConsoleProvider');
  }
  return ctx;
}
