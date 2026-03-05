/**
 * Centralized type and interface definitions for the frontend.
 */

import { SVGProps } from "react";

// --- Tab navigation ---

export type TabId = 'node' | 'network' | 'blocks' | 'wallet' | 'console' | 'docs' | 'settings';

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

/** BTC price per currency (e.g. USD, EUR) from mempool.space. */
export interface BtcPrices {
  USD?: number;
  EUR?: number;
  [key: string]: number | undefined;
}

export interface ApiContextValue {
  apiBaseUrl: string;
  fetchWithRetry: <T>(endpoint: string) => Promise<{ data: T }>;
  fetchNode: () => Promise<NodeData>;
  fetchBlocks: () => Promise<BlocksData>;
  fetchWallet: () => Promise<WalletData>;
  fetchNetwork: () => Promise<NetworkData>;
  fetchPools: () => Promise<Pool[]>;
  fetchDistribution: () => Promise<DistributionData>;
  fetchPrice: () => Promise<BtcPrices>;
  callRpc: (method: string, params?: unknown[]) => Promise<Record<string, unknown>>;
  fetchConfigStatus: () => Promise<ConfigStatus>;
  saveConfig: (payload: ConfigSavePayload) => Promise<{ ok: boolean; error?: string }>;
  saveWalletName: (walletName: string | null) => Promise<{ ok: boolean; error?: string }>;
}

export interface ConfigSavePayload {
  auth_method: 'password' | 'cookie';
  rpc_host?: string;
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

/** Peer entry from getpeerinfo (all fields optional for different node versions). */
export interface Peer {
  id?: number;
  addr?: string;
  addrbind?: string;
  addrlocal?: string;
  network?: string;
  mapped_as?: number;
  services?: string;
  servicesnames?: string[];
  relaytxes?: boolean;
  lastsend?: number;
  lastrecv?: number;
  last_transaction?: number;
  last_block?: number;
  bytessent?: number;
  bytesrecv?: number;
  conntime?: number;
  timeoffset?: number;
  pingtime?: number;
  minping?: number;
  pingwait?: number;
  version?: number;
  subver?: string;
  inbound?: boolean;
  bip152_hb_to?: boolean;
  bip152_hb_from?: boolean;
  startingheight?: number;
  synced_headers?: number;
  synced_blocks?: number;
  connection_type?: string;
  transport_protocol_type?: string;
  permissions?: string[];
  [key: string]: unknown;
}

export interface NodeData {
  blockchain?: Record<string, unknown>;
  network?: Record<string, unknown>;
  mempool?: Record<string, unknown>;
  memory?: Record<string, unknown>;
  host_memory?: Record<string, unknown>;
  host_architecture?: string | null;
  indexing?: Record<string, unknown>;
  hashrate?: number;
  peers?: Peer[];
}

export interface ConfigStatus {
  config_exists: boolean;
  auth_method: 'password' | 'cookie' | null;
  rpc_host: string | null;
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
  time_since_last_block?: string;
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
  chain_height?: number | null;
  seconds_since_last_block?: number | null;
}

/** Bitcoin Core listunspent response item */
export interface UtxoEntry {
  txid?: string;
  vout?: number;
  address?: string;
  amount?: number;
  confirmations?: number;
  [key: string]: unknown;
}

/** Bitcoin Core listtransactions response item */
export interface WalletTransaction {
  txid?: string;
  category?: string;
  amount?: number;
  confirmations?: number;
  time?: number;
  blocktime?: number;
  address?: string;
  [key: string]: unknown;
}

export interface WalletData {
  wallet?: Record<string, unknown>;
  balance?: number;
  unspent?: UtxoEntry[];
  transactions?: WalletTransaction[];
  /** When true, no wallet is loaded; use wallets list to let user select or create. */
  noWallet?: boolean;
  /** Available wallet names when noWallet is true (from listwallets). */
  wallets?: string[];
}

export interface NetworkHistoryEntry {
  timestamp: string;
  blockHeight?: number;
  hashRate?: number;
  difficulty?: number;
}

export interface FeeEstimates {
  high_sat_per_vb?: number | null;
  medium_sat_per_vb?: number | null;
  low_sat_per_vb?: number | null;
}

export interface NetworkData {
  network_history?: NetworkHistoryEntry[];
  total_records?: number;
  fee_estimates?: FeeEstimates | null;
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

export interface IconProps extends SVGProps<SVGSVGElement> {
  className?: string
}
