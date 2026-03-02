/**
 * Centralized type and interface definitions for the frontend.
 */

// --- Tab navigation ---

export type TabId = 'node' | 'blocks' | 'wallet' | 'console' | 'settings';

export interface TabWithLabel {
  id: TabId;
  label: string;
}

export interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onRefresh: () => void;
}

// --- API / data (ApiContext) ---

export interface ApiContextValue {
  apiBaseUrl: string;
  fetchWithRetry: <T>(endpoint: string) => Promise<{ data: T }>;
  fetchNode: () => Promise<NodeData>;
  fetchBlocks: () => Promise<BlocksData>;
  fetchWallet: () => Promise<WalletData>;
  fetchNetwork: () => Promise<NetworkData>;
  fetchPools: () => Promise<Pool[]>;
  fetchDistribution: () => Promise<DistributionData>;
  callRpc: (method: string, params?: unknown[]) => Promise<Record<string, unknown>>;
  fetchConfigStatus: () => Promise<ConfigStatus>;
  saveConfig: (payload: ConfigSavePayload) => Promise<{ ok: boolean; error?: string }>;
}

export interface ConfigSavePayload {
  auth_method: 'password' | 'cookie';
  rpc_port: number;
  rpc_user?: string;
  rpc_password?: string;
  cookie_file?: string;
}

export interface DistributionData {
  updated: string | null;
  blocks_count: number;
  by_pool: Record<string, number>;
  by_percentage: Record<string, number>;
}

export interface NodeData {
  blockchain?: Record<string, unknown>;
  network?: Record<string, unknown>;
  mempool?: Record<string, unknown>;
  memory?: Record<string, unknown>;
  indexing?: Record<string, unknown>;
  hashrate?: number;
  peers?: Array<Record<string, unknown>>;
}

export interface ConfigStatus {
  config_exists: boolean;
  auth_method: 'password' | 'cookie' | null;
  rpc_port: number | null;
  rpc_user_masked: string | null;
  cookie_file: string | null;
  node_configured: boolean;
  error?: string;
}

export interface BlockRow {
  block_height: number;
  block_hash?: string;
  block_time?: string;
  transaction_count?: number;
  block_size?: number;
  block_weight?: number;
  mining_pool?: string;
  total_fees?: number;
  total_fees_usd?: number;
  block_reward?: number;
  [key: string]: unknown;
}

export interface BlocksData {
  blocks: BlockRow[];
  total_blocks?: number;
  cached?: boolean;
  avg_block_time_seconds?: number | null;
}

export interface WalletData {
  wallet?: Record<string, unknown>;
  balance?: number;
  unspent?: unknown[];
  transactions?: unknown[];
}

export interface NetworkData {
  network_history?: Array<Record<string, unknown>>;
  total_records?: number;
}

export interface Pool {
  name: string;
  identifier: string;
  signatures?: string[];
  icon?: string;
  [key: string]: unknown;
}

// --- Console (ConsoleContext) ---

export type LogType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'data-fetch'
  | 'webserver'
  | 'block-found';

export interface ConsoleLine {
  id: number;
  timestamp: string;
  message: string;
  type: LogType;
}

export interface ConsoleContextValue {
  lines: ConsoleLine[];
  log: (message: string, type?: LogType) => void;
  clear: () => void;
  connectionStatus: 'connected' | 'disconnected';
  setConnectionStatus: (status: 'connected' | 'disconnected') => void;
}

// --- Theme (ThemeContext) ---

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}
