import { useMemo, useCallback, useState } from 'react';
import type { SortDir, UseTableSortOptions, UseTableSortResult } from '@/types';

export type { KeyExtractor, SortDir, UseTableSortOptions, UseTableSortResult } from '@/types';

function compare(a: number | string | null | undefined, b: number | string | null | undefined, dir: SortDir): number {
  const empty = (v: number | string | null | undefined) => v === null || v === undefined || v === '';
  if (empty(a) && empty(b)) return 0;
  if (empty(a)) return dir === 'asc' ? -1 : 1;
  if (empty(b)) return dir === 'asc' ? 1 : -1;
  const na = Number(a);
  const nb = Number(b);
  const bothNum = Number.isFinite(na) && Number.isFinite(nb);
  let cmp: number;
  if (bothNum) {
    cmp = na - nb;
  } else {
    cmp = String(a).localeCompare(String(b));
  }
  return dir === 'asc' ? cmp : -cmp;
}

/**
 * Client-side table sort: returns sorted data and sort state.
 * setSort(key): same column toggles asc <-> desc; new column defaults to desc (newest/largest first).
 */
export function useTableSort<T>({
  data,
  keyExtractors,
  defaultSortKey = null,
  defaultSortDir = 'desc',
}: UseTableSortOptions<T>): UseTableSortResult<T> {
  const [sort, setSortState] = useState<{ key: string | null; dir: SortDir }>({
    key: defaultSortKey,
    dir: defaultSortDir,
  });

  const setSort = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev.key === key) {
        return { ...prev, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: 'desc' };
    });
  }, []);

  const sortKey = sort.key ?? defaultSortKey;
  const sortDir = sort.key === null && defaultSortKey ? defaultSortDir : sort.dir;

  const sortedData = useMemo(() => {
    const key = sortKey ?? defaultSortKey;
    const dir = sortKey === null && defaultSortKey ? defaultSortDir : sortDir;
    const extract = key ? keyExtractors[key] : undefined;
    if (!key || !extract) return [...data];
    return [...data].sort((a, b) => compare(extract(a), extract(b), dir));
  }, [data, sortKey, sortDir, defaultSortKey, defaultSortDir, keyExtractors]);

  return { sortedData, sortKey, sortDir, setSort };
}
