import { TABS } from '@/constants';
import type { TabNavProps } from '@/types';
import { RefreshIcon } from './Icons';

export function TabNav({ activeTab, onTabChange, onRefresh }: TabNavProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4 border-b border-gray-200 dark:border-gold/20 pb-2">
      <nav className="flex gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`px-4 py-2 rounded font-medium transition border ${
              activeTab === id
                ? 'bg-blue-50 text-accent-light border-blue-200 dark:bg-gold/20 dark:text-gold dark:border-gold/40'
                : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <button
        type="button"
        onClick={onRefresh}
        className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-white/10"
        title="Refresh"
      >
        <RefreshIcon />
      </button>
    </div>
  );
}
