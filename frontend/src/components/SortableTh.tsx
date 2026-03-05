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
        className="flex items-center gap-1 w-full text-left font-medium hover:text-level-5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset rounded px-2 py-3"
      >
        {label}
        {isActive && (
          <span className="text-accent" aria-hidden>
            {sortDir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </button>
    </th>
  );
}
