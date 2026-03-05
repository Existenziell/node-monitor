import { useEffect } from 'react';
import { clearRefreshTabId } from '@/refreshState';
import type { TabId } from '@/types';

/**
 * Clears the refresh tab id when loading becomes false (e.g. after a tab's data load finishes).
 * Call when the tab is active so the refresh overlay hides.
 */
export function useClearRefreshOnDone(loading: boolean, tabId: TabId): void {
  useEffect(() => {
    if (!loading) {
      clearRefreshTabId(tabId);
    }
  }, [loading, tabId]);
}

/**
 * Clears the refresh tab id when all loading flags are false.
 * Use for tabs that have multiple data sources (e.g. NetworkTab).
 */
export function useClearRefreshOnDoneMulti(loadings: boolean[], tabId: TabId): void {
  const allDone = loadings.every((l) => !l);
  useEffect(() => {
    if (allDone) {
      clearRefreshTabId(tabId);
    }
  }, [allDone, tabId]);
}
