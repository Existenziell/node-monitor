import { useMemo } from 'react';
import { useApi } from '@/contexts/ApiContext';
import type { UtxoEntry, WalletData, WalletTransaction } from '@/types';
import { formatTxTime, truncateTxid } from '@/utils';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export function WalletTab() {
  const { fetchWallet } = useApi();
  const { data, loading, error, load } = useApiData<WalletData>(fetchWallet);

  useTabData(load, 'wallet');

  const unspent: UtxoEntry[] = useMemo(
    () => (Array.isArray(data?.unspent) ? data.unspent : []),
    [data?.unspent]
  );
  const transactions: WalletTransaction[] = useMemo(
    () => (Array.isArray(data?.transactions) ? data.transactions : []),
    [data?.transactions]
  );
  const unspentByConfirmations = useMemo(
    () => [...unspent].sort((a, b) => (b.confirmations ?? 0) - (a.confirmations ?? 0)),
    [unspent]
  );
  const transactionsByTime = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => (b.blocktime ?? b.time ?? 0) - (a.blocktime ?? a.time ?? 0)
      ),
    [transactions]
  );

  if (loading && !data) {
    return <div className="p-4 text-level-4">Loading wallet data...</div>;
  }

  if (error && !data) {
    return (
      <div className="p-4 text-red-400">
        Error loading wallet: {error.message}. Make sure the API server is running and a wallet is loaded.
      </div>
    );
  }

  const wallet = (data?.wallet ?? {}) as Record<string, unknown>;
  const balance = data?.balance ?? 0;

  return (
    <div className="relative space-y-4">
      <LoadingOverlay show={loading && !!data} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-level-2 border border-level-3 p-4">
          <h3 className="text-sm font-medium text-accent mb-2">Wallet</h3>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-level-4">Wallet name</dt>
              <dd className="text-level-5">{String(wallet.walletname ?? 'N/A')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-level-4">Balance</dt>
              <dd className="text-accent">{Number(balance).toFixed(8)} BTC</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-level-4">Tx count</dt>
              <dd className="text-level-5">{wallet.txcount !== null && wallet.txcount !== undefined ? String(wallet.txcount) : 'N/A'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-lg bg-level-2 border border-level-3 overflow-hidden">
        <h3 className="text-sm font-medium text-accent p-4 pb-2">UTXOs ({unspent.length})</h3>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-level-2 text-left">
              <tr>
                <th className="p-2 text-level-4">Txid</th>
                <th className="p-2 text-level-4">Vout</th>
                <th className="p-2 text-level-4">Address</th>
                <th className="p-2 text-level-4">Amount (BTC)</th>
                <th className="p-2 text-level-4">Confirmations</th>
              </tr>
            </thead>
            <tbody>
              {unspent.length === 0 ? (
                <tr className="border-t border-level-3">
                  <td colSpan={5} className="p-4 text-center text-level-4">
                    No UTXOs
                  </td>
                </tr>
              ) : (
                unspentByConfirmations.map((utxo, i) => (
                  <tr
                    key={`${utxo.txid ?? ''}-${utxo.vout ?? i}`}
                    className="border-t border-level-3 hover:bg-level-3"
                  >
                    <td className="p-2 text-level-5 font-mono" title={utxo.txid ?? ''}>
                      {truncateTxid(utxo.txid)}
                    </td>
                    <td className="p-2 text-level-5">{utxo.vout ?? '-'}</td>
                    <td className="p-2 max-w-[200px] truncate text-level-5" title={utxo.address ?? ''}>
                      {utxo.address ?? '-'}
                    </td>
                    <td className="p-2 text-level-5">
                      {utxo.amount !== null && utxo.amount !== undefined && Number.isFinite(utxo.amount) ? Number(utxo.amount).toFixed(8) : '-'}
                    </td>
                    <td className="p-2 text-level-5">{utxo.confirmations ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg bg-level-2 border border-level-3 overflow-hidden">
        <h3 className="text-sm font-medium text-accent p-4 pb-2">Recent transactions</h3>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-level-2 text-left">
              <tr>
                <th className="p-2 text-level-4">Txid</th>
                <th className="p-2 text-level-4">Category</th>
                <th className="p-2 text-level-4">Amount (BTC)</th>
                <th className="p-2 text-level-4">Confirmations</th>
                <th className="p-2 text-level-4">Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr className="border-t border-level-3">
                  <td colSpan={5} className="p-4 text-center text-level-4">
                    No recent transactions
                  </td>
                </tr>
              ) : (
                transactionsByTime.map((tx, i) => (
                  <tr
                    key={`${tx.txid ?? ''}-${tx.vout ?? ''}-${i}`}
                    className="border-t border-level-3 hover:bg-level-3"
                  >
                    <td className="p-2 text-level-5 font-mono" title={tx.txid ?? ''}>
                      {truncateTxid(tx.txid)}
                    </td>
                    <td className="p-2 text-level-5">{tx.category ?? '-'}</td>
                    <td className="p-2 text-level-5">
                      {tx.amount !== null && tx.amount !== undefined && Number.isFinite(tx.amount) ? Number(tx.amount).toFixed(8) : '-'}
                    </td>
                    <td className="p-2 text-level-5">{tx.confirmations ?? '-'}</td>
                    <td className="p-2 text-level-5">{formatTxTime(tx)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
