import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { THEME_STORAGE_KEY, THEME_LIGHT, THEME_DARK } from '@/constants';
import type { Theme, ThemeContextValue } from '@/types';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved === THEME_LIGHT ? THEME_LIGHT : THEME_DARK) as Theme;
  });

  useEffect(() => {
    document.body.classList.toggle('light-mode', theme === THEME_LIGHT);
    document.documentElement.classList.toggle('dark', theme === THEME_DARK);
    document.documentElement.classList.toggle('light', theme === THEME_LIGHT);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === THEME_DARK ? THEME_LIGHT : THEME_DARK));
  }, []);

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    isDark: theme === THEME_DARK,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
