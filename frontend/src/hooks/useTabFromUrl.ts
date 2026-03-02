import { useState, useCallback, useEffect } from 'react';
import { VALID_TABS } from '@/constants';
import type { TabId } from '@/types';

function getTabFromUrl(): TabId {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return tab && VALID_TABS.includes(tab as TabId) ? (tab as TabId) : 'node';
}

export function useTabFromUrl() {
  const [activeTab, setActiveTabState] = useState<TabId>(getTabFromUrl);

  useEffect(() => {
    const tab = getTabFromUrl();
    setActiveTabState(tab);
  }, []);

  const setTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  }, []);

  return { activeTab, setTab };
}
