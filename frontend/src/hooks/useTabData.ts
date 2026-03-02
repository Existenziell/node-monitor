import { useEffect } from 'react';
import type { TabId } from '@/types';

/**
 * Runs load on mount and when a tab-refresh event fires with detail matching tabId.
 * Pass a stable load callback (e.g. from useApiData, or useCallback wrapping multiple loads).
 */
export function useTabData(load: () => Promise<unknown>, tabId: TabId) {
  useEffect(() => {
    load().catch(() => {});
  }, [load]);

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
