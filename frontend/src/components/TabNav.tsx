import { TABS } from '@/data/tabs';
import type { TabId, TabNavProps } from '@/types';
import { RefreshIcon, XIcon } from './Icons';

export const TAB_NAV_DRAWER_ID = 'tab-nav-drawer';

export function TabNav({
  activeTab,
  onTabChange,
  onRefresh,
  isMobileMenuOpen,
  onCloseMobileMenu,
}: TabNavProps) {
  const showRefresh =
    activeTab !== 'console' && activeTab !== 'docs' && activeTab !== 'settings';

  const handleTabSelect = (id: TabId) => {
    onTabChange(id);
    onCloseMobileMenu();
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-4 border-b border-level-3 pb-2">
        {/* Desktop: horizontal tab list (visible from sm up) */}
        <nav className="hidden sm:flex gap-1" aria-label="Main navigation">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`tab-button ${activeTab === id ? 'tab-button-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Desktop: refresh button (right-aligned) */}
        {showRefresh && (
          <div className="hidden sm:block">
            <button
              type="button"
              onClick={onRefresh}
              className="square-button"
              title="Refresh"
            >
              <RefreshIcon />
            </button>
          </div>
        )}
      </div>

      {/* Mobile: backdrop + side drawer (burger in Header) */}
      <div
        className="sm:hidden fixed inset-0 z-40"
        aria-hidden={!isMobileMenuOpen}
        style={{ pointerEvents: isMobileMenuOpen ? undefined : 'none' }}
      >
        <button
          type="button"
          onClick={onCloseMobileMenu}
          className={`absolute inset-0 bg-black/40 transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
          aria-label="Close navigation"
        />
        <aside
          id={TAB_NAV_DRAWER_ID}
          role="dialog"
          aria-label="Navigation menu"
          className={`absolute top-0 right-0 h-full w-[min(280px,85vw)] bg-level-2 border-l border-level-3 shadow-lg flex flex-col transition-transform duration-200 ease-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          <div className="flex items-center justify-between p-3 border-b border-level-3">
            <span className="text-sm font-medium text-level-5">Tabs</span>
            <button
              type="button"
              onClick={onCloseMobileMenu}
              className="square-button"
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
                className={`w-full text-left tab-button ${activeTab === id ? 'tab-button-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
