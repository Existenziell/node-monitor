import React, { createContext, useContext } from 'react';
import { useTabFromUrl } from '@/hooks/useTabFromUrl';
import type { TabId } from '@/types';

interface TabContextValue {
  activeTab: TabId;
  setTab: (tab: TabId) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

export function TabProvider({ children }: { children: React.ReactNode }) {
  const value = useTabFromUrl();
  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

export function useActiveTab(): TabContextValue {
  const ctx = useContext(TabContext);
  if (!ctx) {
    throw new Error('useActiveTab must be used within TabProvider');
  }
  return ctx;
}
