import shared from '@shared/constants.json';
import type { TabId, TabWithLabel } from '@/types';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 2000;

export const MAX_CONSOLE_LINES = shared.MAX_CONSOLE_LINES as number;

export const THEME_STORAGE_KEY = 'theme';
export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

export const TABS: TabWithLabel[] = [
  { id: 'node', label: 'Node' },
  { id: 'network', label: 'Network' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'console', label: 'Console' },
  { id: 'docs', label: 'Docs' },
  { id: 'settings', label: 'Settings' },
];

export const VALID_TABS: TabId[] = TABS.map((t) => t.id);
