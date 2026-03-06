import React, { createContext, useContext, useCallback } from 'react';
import { API_BASE_URL, MAX_RETRIES, RETRY_DELAY_MS } from '@/constants';
import type {
  ApiContextValue,
  BlocksData,
  BtcPrices,
  ConfigSavePayload,
  ConfigStatus,
  ConfigTestResult,
  DistributionData,
  NodeData,
  NetworkData,
  Pool,
  WalletData,
} from '@/types';

const ApiContext = createContext<ApiContextValue | null>(null);

// Re-export data types for consumers that still import from ApiContext
export type {
  BlockRow,
  BlocksData,
  DistributionData,
  NodeData,
  NetworkData,
  Pool,
  WalletData,
} from '@/types';

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const fetchWithRetry = useCallback(
    async <T,>(endpoint: string): Promise<{ data: T }> => {
      const url = `${API_BASE_URL}${endpoint}`;
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`Failed to load ${endpoint}`);
          }
          const data = await res.json();
          if (data.status === 'error') {
            throw new Error(data.message);
          }
          return data;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < MAX_RETRIES - 1) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }
      throw lastError ?? new Error('Request failed');
    },
    []
  );

  const fetchNode = useCallback(async (): Promise<NodeData> => {
    const result = await fetchWithRetry<NodeData>('/node');
    return result.data;
  }, [fetchWithRetry]);

  const fetchBlocksPage = useCallback(
    async (params?: { limit?: number; offset?: number }): Promise<BlocksData> => {
      const limit = params?.limit ?? 20;
      const offset = params?.offset ?? 0;
      const endpoint = `/blocks?limit=${limit}&offset=${offset}`;
      const result = await fetchWithRetry<BlocksData>(endpoint);
      return result.data;
    },
    [fetchWithRetry]
  );

  const fetchBlocks = useCallback(async (): Promise<BlocksData> => {
    return fetchBlocksPage({ limit: 20, offset: 0 });
  }, [fetchBlocksPage]);

  const fetchWallet = useCallback(async (): Promise<WalletData> => {
    const result = await fetchWithRetry<WalletData>('/wallet');
    return result.data;
  }, [fetchWithRetry]);

  const fetchNetwork = useCallback(async (): Promise<NetworkData> => {
    const result = await fetchWithRetry<NetworkData>('/network');
    return result.data;
  }, [fetchWithRetry]);

  const fetchPrice = useCallback(async (): Promise<BtcPrices> => {
    const result = await fetchWithRetry<BtcPrices>('/price');
    return result.data;
  }, [fetchWithRetry]);

  const fetchPools = useCallback(async (): Promise<Pool[]> => {
    const res = await fetch(`${API_BASE_URL}/pools`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.pools ?? [];
  }, []);

  const fetchDistribution = useCallback(async (): Promise<DistributionData> => {
    const result = await fetchWithRetry<DistributionData>('/distribution');
    return result.data;
  }, [fetchWithRetry]);

  const callRpc = useCallback(
    async (method: string, params?: unknown[]): Promise<Record<string, unknown>> => {
      const url = `${API_BASE_URL}/rpc`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params: params ?? [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof data?.error === 'string' ? data.error : `RPC request failed (${res.status})`;
        throw new Error(message);
      }
      return data as Record<string, unknown>;
    },
    []
  );

  const fetchConfigStatus = useCallback(async (): Promise<ConfigStatus> => {
    const res = await fetch(`${API_BASE_URL}/config/status`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error ?? 'Failed to load config status');
    }
    return data as ConfigStatus;
  }, []);

  const fetchConfigTest = useCallback(async (): Promise<ConfigTestResult> => {
    const res = await fetch(`${API_BASE_URL}/config/test`);
    const data = await res.json().catch(() => ({ ok: false, error: 'Request failed' }));
    return data as ConfigTestResult;
  }, []);

  const saveConfig = useCallback(
    async (payload: ConfigSavePayload): Promise<{ ok: boolean; error?: string }> => {
      const res = await fetch(`${API_BASE_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data?.error ?? 'Request failed' };
      }
      return { ok: data.ok === true, error: data.error };
    },
    []
  );

  const saveWalletName = useCallback(
    async (walletName: string | null): Promise<{ ok: boolean; error?: string }> => {
      const res = await fetch(`${API_BASE_URL}/config/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_name: walletName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data?.error ?? 'Request failed' };
      }
      return { ok: data.ok === true, error: data.error };
    },
    []
  );

  const value: ApiContextValue = {
    apiBaseUrl: API_BASE_URL,
    fetchWithRetry,
    fetchNode,
    fetchBlocks,
    fetchBlocksPage,
    fetchWallet,
    fetchNetwork,
    fetchPools,
    fetchDistribution,
    fetchPrice,
    callRpc,
    fetchConfigStatus,
    fetchConfigTest,
    saveConfig,
    saveWalletName,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiContextValue {
  const ctx = useContext(ApiContext);
  if (!ctx) {
    throw new Error('useApi must be used within ApiProvider');
  }
  return ctx;
}
