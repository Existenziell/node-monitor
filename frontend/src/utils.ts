/**
 * Formatting and display helpers used across the app.
 */

import type { WalletTransaction } from '@/types';

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

export function formatBytes(bytes: number | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatWeight(wu: number | undefined): string {
  if (wu === null || wu === undefined || !Number.isFinite(wu) || wu < 0) return '-';
  if (wu >= 1e6) return `${(wu / 1e6).toFixed(2)}M`;
  if (wu >= 1e3) return `${(wu / 1e3).toFixed(1)}K`;
  return String(Math.round(wu));
}

export function formatDifficulty(value: number): string {
  if (!Number.isFinite(value)) return 'N/A';
  if (Math.abs(value) >= 1e12) {
    return `${(value / 1e12).toFixed(2)}T`;
  }
  return value.toLocaleString();
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
