import type { SortDir } from '@/hooks/useTableSort';

interface SortableThProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTh({ label, sortKey, currentSortKey, sortDir, onSort, className }: SortableThProps) {
  const isActive = currentSortKey === sortKey;
  const ariaSort = isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined;

  return (
    <th className={className} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="sortable-th-button"
      >
        {label}
        <span className="inline-block w-[1em] shrink-0 text-center text-accent" aria-hidden>
          {isActive ? (sortDir === 'asc' ? '↑' : '↓') : '\u00A0'}
        </span>
      </button>
    </th>
  );
}
