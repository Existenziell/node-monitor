import type { SortableThProps } from '@/types';
import { ChevronDown, ChevronUp } from '@/components/Icons';

export function SortableTh({ label, sortKey, currentSortKey, sortDir, onSort, className }: SortableThProps) {
  const isActive = currentSortKey === sortKey;
  const ariaSort = isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined;

  return (
    <th className={className} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={isActive ? 'sortable-th-button font-semibold' : 'sortable-th-button'}
      >
        {label}
        <span className="inline-flex h-[1em] w-[1em] shrink-0 items-center justify-center text-accent" aria-hidden>
          {isActive ? (sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : '\u00A0'}
        </span>
      </button>
    </th>
  );
}
