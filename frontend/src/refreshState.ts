import type { TabId } from '@/types';

let refreshTabId: TabId | null = null;

export function getRefreshTabId(): TabId | null {
  return refreshTabId;
}

export function setRefreshTabId(id: TabId | null): void {
  refreshTabId = id;
}

export function clearRefreshTabId(id: TabId): void {
  if (refreshTabId === id) {
    refreshTabId = null;
  }
}
