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

/** Shown when API/data load fails (e.g. in error state and loading gate). */
export const API_SERVER_HINT = 'Make sure the API server is running.';

/** Default RPC connection (from shared/constants.json). */
export const DEFAULT_RPC_HOST = shared.DEFAULT_RPC_HOST as string;
export const DEFAULT_RPC_PORT = String(shared.DEFAULT_RPC_PORT);

/** Bitcoin network constants (from shared/constants.json). */
export const BITCOIN_HALVING_INTERVAL = shared.BITCOIN_HALVING_INTERVAL as number;
export const BITCOIN_RETARGET_INTERVAL = shared.BITCOIN_RETARGET_INTERVAL as number;

export const GITHUB_REPO_URL = 'https://github.com/Existenziell/node-monitor';
