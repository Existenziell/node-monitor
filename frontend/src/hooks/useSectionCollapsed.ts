import { useState, useCallback } from 'react';

const STORAGE_KEY = 'node-monitor-section-collapsed';

function readStore(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>;
    }
  } catch {
    // ignore
  }
  return {};
}

function writeStore(store: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function useSectionCollapsed(sectionId: string): [boolean, () => void] {
  const [store, setStore] = useState<Record<string, boolean>>(readStore);
  const collapsed = store[sectionId] === true;

  const toggle = useCallback(() => {
    setStore((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      writeStore(next);
      return next;
    });
  }, [sectionId]);

  return [collapsed, toggle];
}
