import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { RefreshContextValue, TabId } from '@/types';

const RefreshContext = createContext<RefreshContextValue | null>(null);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshTabId, setRefreshTabIdState] = useState<TabId | null>(null);
  const setRefreshTabId = useCallback((id: TabId | null) => {
    setRefreshTabIdState(id);
  }, []);
  const value: RefreshContextValue = { refreshTabId, setRefreshTabId };
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

export function useRefreshState(): RefreshContextValue {
  const ctx = useContext(RefreshContext);
  if (!ctx) {
    throw new Error('useRefreshState must be used within RefreshProvider');
  }
  return ctx;
}

/**
 * Clears the refresh tab id when loading becomes false (e.g. after a tab's data load finishes).
 * Call when the tab is active so the refresh overlay hides.
 */
export function useRefreshDone(loading: boolean, tabId: TabId): void {
  const { refreshTabId, setRefreshTabId } = useRefreshState();
  useEffect(() => {
    if (!loading && refreshTabId === tabId) {
      setRefreshTabId(null);
    }
  }, [loading, tabId, refreshTabId, setRefreshTabId]);
}

/**
 * Clears the refresh tab id when all loading flags are false.
 * Use for tabs that have multiple data sources (e.g. NetworkTab).
 */
export function useRefreshDoneMulti(loadings: boolean[], tabId: TabId): void {
  const { refreshTabId, setRefreshTabId } = useRefreshState();
  const allDone = loadings.every((l) => !l);
  useEffect(() => {
    if (allDone && refreshTabId === tabId) {
      setRefreshTabId(null);
    }
  }, [allDone, tabId, refreshTabId, setRefreshTabId]);
}
