import { TABS } from '@/constants';
import type { HeaderProps } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { MenuIcon, MoonIcon, RefreshIcon, SunIcon } from './Icons';
import { Logo } from './Logo';
import { TAB_NAV_DRAWER_ID } from './TabNav';

export function Header({
  activeTab,
  onRefresh,
  isMobileMenuOpen,
  onMobileMenuToggle,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const activeLabel = TABS.find((t) => t.id === activeTab)?.label ?? 'Tabs';
  const showRefresh =
    activeTab !== 'console' && activeTab !== 'docs' && activeTab !== 'settings';

  return (
    <header className="flex items-center gap-4 mb-4">
      {/* Desktop: logo + title */}
      <div className="hidden sm:flex items-center gap-4">
        <Logo />
        <h1 className="text-xl font-bold text-level-5 sm:text-2xl">Bitcoin Dashboard</h1>
      </div>
      {/* Mobile: burger + current tab title + refresh */}
      <div className="flex sm:hidden items-center gap-2.5 min-w-0 flex-1">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="square-button"
          aria-expanded={isMobileMenuOpen}
          aria-controls={TAB_NAV_DRAWER_ID}
          aria-label="Toggle navigation"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <span className="text-base font-medium text-level-5 truncate min-w-0">
          {activeLabel}
        </span>
        {showRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="square-button"
            title="Refresh"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="hidden sm:block flex-1" />
      <button
        type="button"
        onClick={toggleTheme}
        className="square-button"
        title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
      >
        {theme === 'dark' ? <SunIcon className="w-5 h-5 sm:w-4 sm:h-4" /> : <MoonIcon className="w-5 h-5 sm:w-4 sm:h-4" />}
      </button>
    </header>
  );
}
