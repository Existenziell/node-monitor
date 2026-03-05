import { useTheme } from '@/contexts/ThemeContext';
import { MoonIcon, SunIcon } from './Icons';
import { Logo } from './Logo';

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-center gap-4 mb-4">
      <Logo />
      <h1 className="text-xl font-bold text-level-5 sm:text-2xl">Bitcoin Dashboard</h1>
      <div className="flex-1" />
      <button
        type="button"
        onClick={toggleTheme}
        className="p-2 rounded-md hover:bg-level-3"
        title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  );
}
