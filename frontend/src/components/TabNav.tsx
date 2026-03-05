import { useState } from 'react';
import { TABS } from '@/constants';
import type { TabId, TabNavProps } from '@/types';
import { MenuIcon, RefreshIcon, XIcon } from './Icons';

const DRAWER_ID = 'tab-nav-drawer';

function tabButtonClass(active: boolean) {
  return `px-4 py-2 rounded text-sm font-medium transition border ${
    active
      ? 'text-accent border-accent'
      : 'text-level-4 hover:bg-level-3 border-transparent'
  }`;
}

export function TabNav({ activeTab, onTabChange, onRefresh }: TabNavProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const activeLabel = TABS.find((t) => t.id === activeTab)?.label ?? 'Tabs';
  const showRefresh =
    activeTab !== 'console' && activeTab !== 'docs' && activeTab !== 'settings';

  const handleTabSelect = (id: TabId) => {
    onTabChange(id);
    setIsMobileOpen(false);
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-4 border-b border-level-3 pb-2">
      {/* Desktop: horizontal tab list (visible from sm up) */}
      <nav className="hidden sm:flex gap-1" aria-label="Main navigation">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={tabButtonClass(activeTab === id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Mobile: compact row with current tab label + burger + optional refresh */}
      <div className="flex sm:hidden items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-medium text-level-5 truncate">
          {activeLabel}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {showRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-md hover:bg-level-3"
              title="Refresh"
            >
              <RefreshIcon />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsMobileOpen((o) => !o)}
            className="p-2 rounded-md hover:bg-level-3"
            aria-expanded={isMobileOpen}
            aria-controls={DRAWER_ID}
            aria-label="Toggle navigation"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {/* Desktop: refresh button (right-aligned) */}
      {showRefresh && (
        <div className="hidden sm:block">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-md hover:bg-level-3"
            title="Refresh"
          >
            <RefreshIcon />
          </button>
        </div>
      )}

      {/* Mobile: backdrop + side drawer */}
      <div
        className="sm:hidden fixed inset-0 z-40"
        aria-hidden={!isMobileOpen}
        style={{ pointerEvents: isMobileOpen ? undefined : 'none' }}
      >
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="absolute inset-0 bg-black/40 transition-opacity"
          aria-label="Close navigation"
        />
        <aside
          id={DRAWER_ID}
          role="dialog"
          aria-label="Navigation menu"
          className={`absolute top-0 right-0 h-full w-[min(280px,85vw)] bg-level-2 border-l border-level-3 shadow-lg flex flex-col transition-transform duration-200 ease-out ${
            isMobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between p-3 border-b border-level-3">
            <span className="text-sm font-medium text-level-5">Tabs</span>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-md hover:bg-level-3"
              aria-label="Close menu"
            >
              <XIcon />
            </button>
          </div>
          <nav className="flex flex-col gap-1 p-3" aria-label="Main navigation">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleTabSelect(id)}
                className={`w-full text-left ${tabButtonClass(activeTab === id)}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
