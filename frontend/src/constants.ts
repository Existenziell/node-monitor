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
