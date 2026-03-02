import { useApi } from '@/contexts/ApiContext';
import type { WalletData } from '@/types';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';

export function WalletTab() {
  const { fetchWallet } = useApi();
  const { data, loading, error, load } = useApiData<WalletData>(fetchWallet);

  useTabData(load, 'wallet');

  if (loading && !data) {
    return <div className="p-4 text-gray-600 dark:text-gray-400">Loading wallet data...</div>;
  }

  if (error && !data) {
    return (
      <div className="p-4 text-red-400 dark:text-red-400">
        Error loading wallet: {error.message}. Make sure the API server is running and a wallet is loaded.
      </div>
    );
  }

  const wallet = (data?.wallet ?? {}) as Record<string, unknown>;
  const balance = data?.balance ?? 0;
  const unspent = (data?.unspent ?? []) as unknown[];
  const transactions = (data?.transactions ?? []) as unknown[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 p-4">
          <h3 className="text-accent-light dark:text-gold font-medium mb-2">Wallet</h3>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Wallet name</dt>
              <dd className="text-gray-900 dark:text-gray-300">{String(wallet.walletname ?? 'N/A')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Balance</dt>
              <dd className="text-accent-light dark:text-gold">{Number(balance).toFixed(8)} BTC</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Tx count</dt>
              <dd className="text-gray-900 dark:text-gray-300">{wallet.txcount !== null && wallet.txcount !== undefined ? String(wallet.txcount) : 'N/A'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {unspent.length > 0 && (
        <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 p-4">
          <h3 className="text-accent-light dark:text-gold font-medium mb-2">UTXOs ({unspent.length})</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">Use node RPC for full list.</div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 p-4">
          <h3 className="text-accent-light dark:text-gold font-medium mb-2">Recent transactions</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">Use node RPC for full list.</div>
        </div>
      )}
    </div>
  );
}
