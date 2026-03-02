import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApi } from '@/contexts/ApiContext';
import { useApiData } from '@/hooks/useApiData';
import { ApiProvider } from '@/contexts/ApiContext';
import { ConsoleProvider } from '@/contexts/ConsoleContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConsoleProvider>
      <ApiProvider>
        {children}
      </ApiProvider>
    </ConsoleProvider>
  );
}

function useNodeDataWithApi() {
  const api = useApi();
  return useApiData(api.fetchNode);
}

describe('useApiData', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('starts with null data and not loading', () => {
    const { result } = renderHook(() => useNodeDataWithApi(), { wrapper });
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('load sets data on success', async () => {
    const mockData = { blockchain: { blocks: 800000 }, network: {} };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'success', data: mockData }),
    });
    const { result } = renderHook(() => useNodeDataWithApi(), { wrapper });
    await act(async () => {
      await result.current.load();
    });
    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('load sets error on failure', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useNodeDataWithApi(), { wrapper });
    await act(async () => {
      try {
        await result.current.load();
      } catch {
        // expected
      }
    });
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Network error');
  });
});
