import { TABS } from '@/constants';
import type { TabNavProps } from '@/types';
import { RefreshIcon } from './Icons';

export function TabNav({ activeTab, onTabChange, onRefresh }: TabNavProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4 border-b border-level-3 pb-2">
      <nav className="flex gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`px-4 py-2 rounded text-sm font-medium transition border ${
              activeTab === id
                ? 'text-accent border-accent'
                : 'text-level-4 hover:bg-level-3 border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      {activeTab !== 'console' && activeTab !== 'docs' && activeTab !== 'settings' && (
        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-md hover:bg-level-3"
          title="Refresh"
        >
          <RefreshIcon />
        </button>
      )}
    </div>
  );
}
