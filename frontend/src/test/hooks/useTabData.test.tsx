import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTabData } from '@/hooks/useTabData';

describe('useTabData', () => {
  let load: () => Promise<unknown>;

  beforeEach(() => {
    load = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls load on mount', () => {
    renderHook(() => useTabData(load, 'node'));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('calls load when tab-refresh event fires with matching tabId', () => {
    renderHook(() => useTabData(load, 'blocks'));
    expect(load).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new CustomEvent('tab-refresh', { detail: 'blocks' }));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not call load when tab-refresh event fires with non-matching tabId', () => {
    renderHook(() => useTabData(load, 'node'));
    expect(load).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new CustomEvent('tab-refresh', { detail: 'wallet' }));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('catches load errors and does not throw', () => {
    const failingLoad = vi.fn().mockRejectedValue(new Error('fail'));
    expect(() => {
      renderHook(() => useTabData(failingLoad, 'node'));
    }).not.toThrow();
  });
});
