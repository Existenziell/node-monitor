import { useTheme } from '@/contexts/ThemeContext';
import { MoonIcon, SunIcon } from './Icons';

const LogoSvg = () => (
  <svg
    className="h-10 w-10 text-current drop-shadow-sm"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.75 18.5V21H11.25V18.5H12.75Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17 16.75H7V15.25H17V16.75Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17 12.7499H7V11.2499H17V12.7499Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17 8.75H7V7.25H17V8.75Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.75 3V5.5H11.25V3H12.75Z"
      fill="currentColor"
    />
  </svg>
);

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-center gap-4 mb-4">
      <LogoSvg />
      <h1 className="text-2xl font-bold text-level-5">Bitcoin Dashboard</h1>
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
