/**
 * Formatting and display helpers used across the app.
 */

import type { WalletTransaction } from '@/types';

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

/** Human-readable duration (e.g. "3:04 min", "1:30 h", "1:12 d"). */
export function formatTimeSince(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '-';
  if (seconds === 0) return '0 s';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')} min`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}:${String(m).padStart(2, '0')} h`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}:${String(h).padStart(2, '0')} d`;
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

export function truncateTxid(txid: string | undefined): string {
  if (txid === null || txid === undefined || txid === '') return '-';
  if (txid.length <= 16) return txid;
  return `${txid.slice(0, 8)}…${txid.slice(-8)}`;
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
