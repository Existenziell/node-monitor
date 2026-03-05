/**
 * Centralized type and interface definitions for the frontend.
 */

import type { ReactNode, SVGProps } from "react";

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
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
}

export interface HeaderProps {
  activeTab: TabId;
  onRefresh: () => void;
  isMobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
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
  fetchConfigTest: () => Promise<ConfigTestResult>;
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

export interface NetTotals {
  totalbytesrecv?: number;
  totalbytessent?: number;
  timemillis?: number;
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
  /** Node uptime in seconds (from uptime RPC). */
  uptime?: number | null;
  /** Total bytes sent/received (from getnettotals RPC). */
  nettotals?: NetTotals | null;
  /** Number of peer connections (from getconnectioncount RPC). */
  connection_count?: number | null;
}

export interface ConfigStatus {
  config_exists: boolean;
  auth_method: 'password' | 'cookie' | null;
  rpc_host: string | null;
  rpc_port: number | null;
  rpc_user_masked: string | null;
  cookie_file: string | null;
  wallet_name: string | null;
  node_configured: boolean;
  /** Loaded wallet names from listwallets (when RPC available). */
  loaded_wallets?: string[];
  error?: string;
}

export interface ConfigTestResult {
  ok: boolean;
  version?: string | null;
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

export interface WalletBalanceBreakdown {
  trusted?: number;
  untrusted_pending?: number;
  immature?: number;
  [key: string]: unknown;
}

export interface WalletData {
  wallet?: Record<string, unknown>;
  balance?: number;
  /** Balance breakdown from getbalances (mine.trusted, untrusted_pending, immature). */
  balances?: { mine?: WalletBalanceBreakdown; watchonly?: WalletBalanceBreakdown } | null;
  unspent?: UtxoEntry[];
  transactions?: WalletTransaction[];
  /** When true, no wallet is loaded; use wallets list to let user select or create. */
  noWallet?: boolean;
  /** Available wallet names when noWallet is true (from listwallets). */
  wallets?: string[];
  /** All currently loaded wallet names (from listwallets). Used for wallet switcher. */
  loadedWallets?: string[];
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

/** Per-bucket error messages when fee estimation failed (key = high_sat_per_vb | medium_sat_per_vb | low_sat_per_vb). */
export interface FeeEstimateErrors {
  high_sat_per_vb?: string | null;
  medium_sat_per_vb?: string | null;
  low_sat_per_vb?: string | null;
}

export interface NetworkData {
  network_history?: NetworkHistoryEntry[];
  total_records?: number;
  fee_estimates?: FeeEstimates | null;
  fee_estimate_errors?: FeeEstimateErrors | null;
}

export interface Pool {
  name: string;
  identifier: string;
  signatures?: string[];
  icon?: string;
  [key: string]: unknown;
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

// --- Refresh (RefreshContext) ---

export interface RefreshContextValue {
  refreshTabId: TabId | null;
  setRefreshTabId: (id: TabId | null) => void;
}

// --- Table sort (useTableSort) ---

export type SortDir = 'asc' | 'desc';

export type KeyExtractor<T> = (row: T) => number | string | null | undefined;

export interface UseTableSortOptions<T> {
  data: T[];
  keyExtractors: Record<string, KeyExtractor<T>>;
  /** Default sort key (e.g. 'height'). If set, initial sort is applied. */
  defaultSortKey?: string | null;
  /** Default direction for defaultSortKey. */
  defaultSortDir?: SortDir;
}

export interface UseTableSortResult<T> {
  sortedData: T[];
  sortKey: string | null;
  sortDir: SortDir;
  setSort: (key: string) => void;
}

// --- Settings tab ---

/** Baseline values from last load/save for dirty checking. rpcUser is null when masked. */
export interface SettingsBaseline {
  authMethod: 'password' | 'cookie';
  rpcHost: string;
  rpcPort: string;
  rpcUser: string | null;
  cookieFile: string;
  hasPassword: boolean;
}

export interface PendingChange {
  field: string;
  from?: string;
  to?: string;
  sensitive?: boolean;
}

// --- Node tab ---

export interface GroupedItem {
  label: string;
  value: unknown;
}

// --- Network history chart ---

export interface ChartPoint {
  time: number;
  timeLabel: string;
  blockHeight: number | null;
  hashrate: number | null;
  difficulty: number | null;
}

export interface NetworkHistoryChartProps {
  networkHistory: NetworkHistoryEntry[];
}

// --- Component props ---

export interface SortableThProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  sortDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
}

export interface SectionHeaderProps {
  children: ReactNode;
  as?: 'h2' | 'h3';
  title?: string;
  className?: string;
}

export interface LoadingErrorGateProps<T> {
  loading: boolean;
  error: Error | null;
  data: T | null;
  loadingLabel: string;
  errorLabel?: string;
  /** If set, used instead of API_SERVER_HINT (e.g. wallet tab adds "A wallet must be loaded."). */
  errorHint?: ReactNode;
  children: ReactNode;
}

export interface LoadingOverlayProps {
  show: boolean;
  message?: string;
}

export interface SpinnerProps {
  size?: 'sm' | 'lg';
  className?: string;
  'aria-hidden'?: boolean;
}

export interface LogoProps {
  className?: string;
}
