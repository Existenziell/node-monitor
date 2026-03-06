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
