import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatBytes,
  formatWeight,
  formatDifficulty,
  truncateTxid,
  formatTxTime,
  formatParams,
} from '@/utils';

describe('formatDuration', () => {
  it('returns "-" for non-finite or non-positive seconds', () => {
    expect(formatDuration(0)).toBe('-');
    expect(formatDuration(-1)).toBe('-');
    expect(formatDuration(NaN)).toBe('-');
    expect(formatDuration(Infinity)).toBe('-');
  });

  it('formats seconds only', () => {
    expect(formatDuration(1)).toBe('1s');
    expect(formatDuration(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(125)).toBe('2m 5s');
  });

  it('formats hours', () => {
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(3660)).toBe('1h 1m');
    expect(formatDuration(7325)).toBe('2h 2m');
  });
});

describe('formatBytes', () => {
  it('returns "-" for invalid or negative values', () => {
    expect(formatBytes(undefined)).toBe('-');
    expect(formatBytes(null as unknown as undefined)).toBe('-');
    expect(formatBytes(NaN)).toBe('-');
    expect(formatBytes(-1)).toBe('-');
  });

  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats KB', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024 - 1)).toBe('1024.0 KB');
  });

  it('formats MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.50 MB');
  });
});

describe('formatWeight', () => {
  it('returns "-" for invalid or negative values', () => {
    expect(formatWeight(undefined)).toBe('-');
    expect(formatWeight(null as unknown as undefined)).toBe('-');
    expect(formatWeight(NaN)).toBe('-');
    expect(formatWeight(-1)).toBe('-');
  });

  it('formats raw weight units', () => {
    expect(formatWeight(0)).toBe('0');
    expect(formatWeight(500)).toBe('500');
  });

  it('formats K', () => {
    expect(formatWeight(1000)).toBe('1.0K');
    expect(formatWeight(2500)).toBe('2.5K');
    expect(formatWeight(999999)).toBe('1000.0K');
  });

  it('formats M', () => {
    expect(formatWeight(1e6)).toBe('1.00M');
    expect(formatWeight(2.5e6)).toBe('2.50M');
  });
});

describe('formatDifficulty', () => {
  it('returns "N/A" for non-finite value', () => {
    expect(formatDifficulty(NaN)).toBe('N/A');
    expect(formatDifficulty(Infinity)).toBe('N/A');
  });

  it('formats large values with T suffix', () => {
    expect(formatDifficulty(1e12)).toBe('1.00T');
    expect(formatDifficulty(2.5e12)).toBe('2.50T');
    expect(formatDifficulty(-1e12)).toBe('-1.00T');
  });

  it('formats normal values with toLocaleString', () => {
    expect(formatDifficulty(1000)).toBe('1,000');
    expect(formatDifficulty(50000)).toBe('50,000');
  });
});

describe('truncateTxid', () => {
  it('returns "-" for empty or missing txid', () => {
    expect(truncateTxid(undefined)).toBe('-');
    expect(truncateTxid(null as unknown as undefined)).toBe('-');
    expect(truncateTxid('')).toBe('-');
  });

  it('returns txid as-is when length <= 16', () => {
    expect(truncateTxid('abc')).toBe('abc');
    expect(truncateTxid('0123456789abcdef')).toBe('0123456789abcdef');
  });

  it('truncates long txid to first 8 and last 8', () => {
    expect(truncateTxid('0123456789abcdef0123456789abcdef')).toBe('01234567…89abcdef');
  });
});

describe('formatTxTime', () => {
  it('returns "-" when tx has no time', () => {
    expect(formatTxTime({})).toBe('-');
    expect(formatTxTime({ time: undefined, blocktime: undefined })).toBe('-');
    expect(formatTxTime({ time: null, blocktime: null })).toBe('-');
    expect(formatTxTime({ time: NaN })).toBe('-');
  });

  it('uses blocktime when present', () => {
    // 2020-01-01 12:00:00 UTC
    const tx = { blocktime: 1577880000 };
    const result = formatTxTime(tx);
    expect(result).not.toBe('-');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back to time when blocktime is missing', () => {
    const tx = { time: 1577880000 };
    const result = formatTxTime(tx);
    expect(result).not.toBe('-');
    expect(typeof result).toBe('string');
  });
});

describe('formatParams', () => {
  it('pretty-prints array as JSON with 2-space indent', () => {
    expect(formatParams([1, 2, 3])).toBe('[\n  1,\n  2,\n  3\n]');
    expect(formatParams([{ a: 1 }])).toBe('[\n  {\n    "a": 1\n  }\n]');
  });

  it('handles empty array', () => {
    expect(formatParams([])).toBe('[]');
  });
});
