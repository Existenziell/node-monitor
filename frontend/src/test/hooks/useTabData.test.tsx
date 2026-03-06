import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTabData } from '@/hooks/useTabData';

vi.mock('@/contexts/TabContext', () => ({
  useActiveTab: () => ({ activeTab: 'node' as const }),
}));

describe('useTabData', () => {
  let load: () => Promise<unknown>;

  beforeEach(() => {
    load = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls load on mount when tab is active and has no data', () => {
    renderHook(() => useTabData(load, 'node', false));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not call load on mount when hasData is true', () => {
    renderHook(() => useTabData(load, 'node', true));
    expect(load).not.toHaveBeenCalled();
  });

  it('calls load when tab-refresh event fires with matching tabId', () => {
    renderHook(() => useTabData(load, 'blocks', false));
    expect(load).toHaveBeenCalledTimes(0);
    window.dispatchEvent(new CustomEvent('tab-refresh', { detail: 'blocks' }));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('calls load on tab-refresh even when hasData is true', () => {
    renderHook(() => useTabData(load, 'node', true));
    expect(load).not.toHaveBeenCalled();
    window.dispatchEvent(new CustomEvent('tab-refresh', { detail: 'node' }));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not call load when tab-refresh event fires with non-matching tabId', () => {
    renderHook(() => useTabData(load, 'node', false));
    expect(load).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new CustomEvent('tab-refresh', { detail: 'wallet' }));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('catches load errors and does not throw', () => {
    const failingLoad = vi.fn().mockRejectedValue(new Error('fail'));
    expect(() => {
      renderHook(() => useTabData(failingLoad, 'node', false));
    }).not.toThrow();
  });
});
