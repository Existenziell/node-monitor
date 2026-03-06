import { useEffect } from 'react';
import { useActiveTab } from '@/contexts/TabContext';
import type { TabId } from '@/types';

/**
 * Runs load when this tab is active and (we don't have data yet or a tab-refresh event
 * targets this tab). Pass hasData so we skip loading when switching back to a tab that
 * already has data (keeps tab panels mounted elsewhere).
 */
export function useTabData(
  load: () => Promise<unknown>,
  tabId: TabId,
  hasData: boolean
) {
  const { activeTab } = useActiveTab();

  useEffect(() => {
    if (activeTab !== tabId) return;
    if (hasData) return;
    load().catch(() => {});
  }, [activeTab, tabId, hasData, load]);

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === tabId) {
        load().catch(() => {});
      }
    };
    window.addEventListener('tab-refresh', handler);
    return () => window.removeEventListener('tab-refresh', handler);
  }, [load, tabId]);
}
