/**
 * Formatting and display helpers used across the app.
 */

import { DEFAULT_RPC_HOST, DEFAULT_RPC_PORT } from '@/constants';
import type { PendingChange, SettingsBaseline, WalletTransaction } from '@/types';

/** Safe message from unknown error (catch blocks, API responses). */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (e !== null && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return String(e);
}

/** Merge class names (e.g. Tailwind). Filters out falsy values and joins with spaces. */
export function cn(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '-';
  }

  const totalSeconds = Math.round(seconds);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

function pluralUnit(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Human-readable duration (e.g. "3 minutes 4 seconds", "11 days 10 hours"). */
export function formatTimeSince(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '-';
  const totalSeconds = Math.floor(seconds);
  if (totalSeconds === 0) return '0 seconds';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (days > 0) {
    const parts = [pluralUnit(days, 'day', 'days')];
    if (hours > 0) parts.push(pluralUnit(hours, 'hour', 'hours'));
    return parts.join(' ');
  }
  if (hours > 0) {
    const parts = [pluralUnit(hours, 'hour', 'hours')];
    if (minutes > 0) parts.push(pluralUnit(minutes, 'minute', 'minutes'));
    return parts.join(' ');
  }
  if (minutes > 0) {
    const parts = [pluralUnit(minutes, 'minute', 'minutes')];
    if (secs > 0) parts.push(pluralUnit(secs, 'second', 'seconds'));
    return parts.join(' ');
  }
  return pluralUnit(secs, 'second', 'seconds');
}

export function formatBytes(bytes: number | undefined | null): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
}

export function formatWeight(wu: number | undefined): string {
  if (wu === null || wu === undefined || !Number.isFinite(wu) || wu < 0) return '-';
  if (wu >= 1e6) return `${(wu / 1e6).toFixed(2)}M`;
  if (wu >= 1e3) return `${(wu / 1e3).toFixed(1)}K`;
  return String(Math.round(wu));
}

export function formatDifficulty(value: number | undefined | null): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return 'N/A';
  const num = Number(value);
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)} T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)} G`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)} M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)} K`;
  return num.toLocaleString();
}

const HASH_START = 6;
const HASH_END = 6;
const HASH_MAX_FULL = 12;

/** Uniform format for hash-like strings (address, txid, block hash): "123456…789abc". */
export function formatHash(value: string | undefined | null, emptyPlaceholder = '-'): string {
  if (value === null || value === undefined || value === '') return emptyPlaceholder;
  const s = String(value).trim();
  if (s.length <= HASH_MAX_FULL) return s;
  return `${s.slice(0, HASH_START)}…${s.slice(-HASH_END)}`;
}

export function formatTxTime(tx: WalletTransaction): string {
  const t = tx.blocktime ?? tx.time;
  if (t === null || t === undefined || !Number.isFinite(t)) return '-';
  try {
    return new Date(t * 1000).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return '-';
  }
}

/** Pretty-print a params array as JSON for the Params textarea. */
export function formatParams(arr: unknown[]): string {
  return JSON.stringify(arr, null, 2);
}

// --- Network ---
export function formatPrice(usd: number | undefined): string {
  if (usd === undefined || usd === null || !Number.isFinite(usd)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(usd);
}

// --- Blocks ---
/** Parse block_time UTC string (YYYY-MM-DD HH:mm:ss) to timestamp ms, or null. */
export function parseBlockTimeUtc(blockTimeStr: string): number | null {
  if (!blockTimeStr || typeof blockTimeStr !== 'string') return null;
  const ts = Date.parse(blockTimeStr + 'Z');
  return Number.isFinite(ts) ? ts : null;
}

/** Identifier is an "unknown" pool when backend could not match a known pool (e.g. "Unknown Pool (hex...)" or "Solo Miner / Unknown"). */
export function isUnknownPoolIdentifier(identifier: string): boolean {
  return identifier.startsWith('Unknown Pool (') || identifier === 'Solo Miner / Unknown';
}

// --- Console (RPC response) ---
/** Unescape common JSON string sequences so long messages (e.g. RPC help) render readably. */
export function unescapeForDisplay(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"');
}

/** Pretty-print a value for the response panel, with readable multi-line strings. */
export function formatResponseForDisplay(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);

  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);

  if (typeof value === 'string') {
    const decoded = unescapeForDisplay(value);
    if (decoded.includes('\n')) {
      const lines = decoded.split('\n');
      return '\n' + lines.map((line) => padInner + line).join('\n');
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => padInner + formatResponseForDisplay(v, indent + 1).trimStart());
    return '[\n' + items.join(',\n') + '\n' + pad + ']';
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const lines = entries.map(([k, v]) => {
      const formatted = formatResponseForDisplay(v, indent + 1);
      const key = JSON.stringify(k);
      const multiLine = typeof v === 'string' && formatted.startsWith('\n');
      const valuePart = multiLine ? formatted : formatted.trimStart();
      return padInner + key + ': ' + valuePart;
    });
    return '{\n' + lines.join(',\n') + '\n' + pad + '}';
  }

  return String(value);
}

// --- Node ---
export function formatBtcPerKvB(n: number | undefined | null): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return `${Number(n).toFixed(8)} BTC/kvB`;
}

export function formatBtc(n: number | undefined | null): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return `${Number(n).toFixed(8)} BTC`;
}

/** Extract UA comment from subversion string, e.g. "/Satoshi:22.0.0(my comment)/" -> "my comment". */
export function parseUaComment(subversion: string | undefined | null): string {
  if (subversion === null || subversion === undefined || subversion === '') return '–';
  const match = String(subversion).match(/\(([^)]*)\)/);
  return match ? match[1].trim() : '–';
}

/** Subversion string with UA comment stripped, e.g. "/Satoshi:22.0.0(my comment)/" -> "/Satoshi:22.0.0/". */
export function subversionWithoutUaComment(subversion: string | undefined | null): string {
  if (subversion === null || subversion === undefined || subversion === '') return 'N/A';
  return String(subversion).replace(/\s*\([^)]*\)\s*/, '').trim() || 'N/A';
}

export function formatUptime(seconds: number | undefined | null): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return 'N/A';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(seconds)}s`;
}

// --- Settings ---
export function getPendingChanges(
  baseline: SettingsBaseline | null,
  current: {
    authMethod: 'password' | 'cookie';
    rpcHost: string;
    rpcPort: string;
    rpcUser: string;
    rpcPassword: string;
    cookieFile: string;
  }
): PendingChange[] {
  if (!baseline) return [];
  const changes: PendingChange[] = [];
  const authLabel = (v: 'password' | 'cookie') => (v === 'password' ? 'Username / Password' : 'Cookie file');

  if (baseline.authMethod !== current.authMethod) {
    changes.push({
      field: 'Authentication',
      from: authLabel(baseline.authMethod),
      to: authLabel(current.authMethod),
    });
  }
  const trim = (s: string) => (s || '').trim();
  if (trim(baseline.rpcHost) !== trim(current.rpcHost)) {
    changes.push({ field: 'RPC Host', from: baseline.rpcHost || DEFAULT_RPC_HOST, to: current.rpcHost || DEFAULT_RPC_HOST });
  }
  const normPort = (s: string) => String(parseInt(s, 10) || Number(DEFAULT_RPC_PORT));
  if (normPort(baseline.rpcPort) !== normPort(current.rpcPort)) {
    changes.push({ field: 'RPC Port', from: baseline.rpcPort, to: current.rpcPort });
  }
  const trimHost = (s: string) => (s || '').trim();
  if (current.authMethod === 'password') {
    const baseUser = baseline.rpcUser ?? '';
    if (trimHost(baseUser) !== trimHost(current.rpcUser)) {
      changes.push({
        field: 'RPC Username',
        from: baseline.rpcUser !== null ? baseline.rpcUser : 'Not configured',
        to: current.rpcUser || 'Not configured',
      });
    }
    if (current.rpcPassword) {
      changes.push({
        field: 'RPC Password',
        to: 'will be updated',
        sensitive: true,
      });
    }
  }
  if (current.authMethod === 'cookie' && trimHost(baseline.cookieFile) !== trimHost(current.cookieFile)) {
    changes.push({
      field: 'Cookie file path',
      from: baseline.cookieFile || 'Not set',
      to: current.cookieFile || 'Not set',
    });
  }
  return changes;
}
