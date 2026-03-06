import shared from '@shared/constants.json';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 2000;

export const THEME_STORAGE_KEY = 'theme';
export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

export const API_SERVER_HINT = 'Make sure the API server is running.';

export const DEFAULT_RPC_HOST = shared.DEFAULT_RPC_HOST as string;
export const DEFAULT_RPC_PORT = String(shared.DEFAULT_RPC_PORT);

export const BITCOIN_HALVING_INTERVAL = shared.BITCOIN_HALVING_INTERVAL as number;
export const BITCOIN_RETARGET_INTERVAL = shared.BITCOIN_RETARGET_INTERVAL as number;

export const PIE_COLORS = [
  'oklch(0.55 0.2 250)',
  'oklch(0.65 0.2 85)',
  'oklch(0.6 0.18 160)',
  'oklch(0.55 0.22 300)',
  'oklch(0.7 0.15 200)',
  'oklch(0.6 0.2 30)',
  'oklch(0.5 0.2 180)',
  'oklch(0.65 0.18 280)',
  'oklch(0.55 0.15 140)',
  'oklch(0.6 0.2 340)',
  'oklch(0.5 0.18 220)',
  'oklch(0.7 0.12 60)',
];

export const POOL_ICON_SIZE = 16;
