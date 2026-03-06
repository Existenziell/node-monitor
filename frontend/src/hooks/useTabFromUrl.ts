import { useState, useCallback, useEffect } from 'react';
import { VALID_TABS } from '@/data/tabs';
import type { TabId } from '@/types';

function getTabFromUrl(): TabId {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return tab && VALID_TABS.includes(tab as TabId) ? (tab as TabId) : 'node';
}

export function useTabFromUrl() {
  const [activeTab, setActiveTabState] = useState<TabId>(getTabFromUrl);

  useEffect(() => {
    setActiveTabState(getTabFromUrl());
  }, []);

  useEffect(() => {
    const handlePopState = () => setActiveTabState(getTabFromUrl());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  }, []);

  return { activeTab, setTab };
}
