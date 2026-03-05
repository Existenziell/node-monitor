import { useEffect, useMemo, useState } from 'react';
import { useApi } from '@/contexts/ApiContext';
import type { UtxoEntry, WalletData, WalletTransaction } from '@/types';
import { formatTxTime, truncateTxid } from '@/utils';
import { getRefreshTabId, clearRefreshTabId } from '@/refreshState';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { useTableSort } from '@/hooks/useTableSort';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { SortableTh } from '@/components/SortableTh';
import { EyeIcon, EyeSlashIcon } from '@/components/Icons';

export function WalletTab() {
  const { fetchWallet, callRpc, saveWalletName } = useApi();
  const { data, loading, error, load } = useApiData<WalletData>(fetchWallet);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createPassphrase, setCreatePassphrase] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [balanceVisible, setBalanceVisible] = useState(true);

  useTabData(load, 'wallet');

  useEffect(() => {
    if (!loading) {
      clearRefreshTabId('wallet');
    }
  }, [loading]);

  const unspent: UtxoEntry[] = useMemo(
    () => (Array.isArray(data?.unspent) ? data.unspent : []),
    [data?.unspent]
  );
  const transactions: WalletTransaction[] = useMemo(
    () => (Array.isArray(data?.transactions) ? data.transactions : []),
    [data?.transactions]
  );
  const unspentSort = useTableSort<UtxoEntry>({
    data: unspent,
    keyExtractors: {
      txid: (u) => (u.txid ?? '') || null,
      vout: (u) => (u.vout !== null && u.vout !== undefined ? u.vout : null),
      address: (u) => (u.address ?? '') || null,
      amount: (u) => (u.amount !== null && u.amount !== undefined && Number.isFinite(u.amount) ? u.amount : null),
      confirmations: (u) => (u.confirmations !== null && u.confirmations !== undefined ? u.confirmations : null),
    },
    defaultSortKey: 'confirmations',
    defaultSortDir: 'desc',
  });
  const transactionsSort = useTableSort<WalletTransaction>({
    data: transactions,
    keyExtractors: {
      txid: (t) => (t.txid ?? '') || null,
      category: (t) => (t.category ?? '') || null,
      address: (t) => (t.address ?? '') || null,
      amount: (t) => (t.amount !== null && t.amount !== undefined && Number.isFinite(t.amount) ? t.amount : null),
      confirmations: (t) => (t.confirmations !== null && t.confirmations !== undefined ? t.confirmations : null),
      time: (t) => (t.blocktime ?? t.time) ?? null,
    },
    defaultSortKey: 'time',
    defaultSortDir: 'desc',
  });

  const handleLoadWallet = async (name: string) => {
    setActionError(null);
    setActionLoading(true);
    try {
      const res = await callRpc('loadwallet', [name]);
      const err = (res as { error?: unknown })?.error;
      if (err !== null && err !== undefined) {
        const msg = typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: string }).message)
          : String(err);
        throw new Error(msg);
      }
      const save = await saveWalletName(name);
      if (!save.ok) throw new Error(save.error ?? 'Failed to save wallet');
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    const name = createName.trim();
    if (!name) {
      setActionError('Wallet name is required');
      return;
    }
    setActionError(null);
    setActionLoading(true);
    try {
      const res = await callRpc('createwallet', [
        name,
        false,
        true,
        createPassphrase.trim() || '',
        false,
        true,
      ]);
      const err = (res as { error?: unknown })?.error;
      if (err !== null && err !== undefined) {
        const msg = typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: string }).message)
          : String(err);
        throw new Error(msg);
      }
      const save = await saveWalletName(name);
      if (!save.ok) throw new Error(save.error ?? 'Failed to save wallet');
      setCreateName('');
      setCreatePassphrase('');
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-4 text-level-4 flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-level-3 border-t-accent" aria-hidden />
        Loading wallet…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 text-red-400">
        Error loading wallet: {error.message}. Make sure the API server is running and a wallet is loaded.
      </div>
    );
  }

  if (data?.noWallet === true) {
    const wallets = Array.isArray(data.wallets) ? data.wallets : [];
    return (
      <div className="space-y-4 p-4">
        <p className="text-level-4">No wallet is loaded. Choose a wallet to load and use.</p>
        {actionError && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
            {actionError}
          </div>
        )}
        {wallets.length === 0 ? (
          <div className="rounded-lg bg-level-2 border border-level-3 p-4 space-y-4">
            <p className="text-level-4">No wallets found. Create one to get started.</p>
            <div className="flex flex-col gap-3 max-w-sm">
              <label className="text-sm text-level-4">
                Wallet name
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. mywallet"
                  className="mt-1 block w-full rounded border border-level-3 bg-level-1 px-3 py-2 text-level-5 focus:border-accent focus:outline-none"
                />
              </label>
              <label className="text-sm text-level-4">
                Passphrase (optional)
                <input
                  type="password"
                  value={createPassphrase}
                  onChange={(e) => setCreatePassphrase(e.target.value)}
                  placeholder="Leave empty for no encryption"
                  className="mt-1 block w-full rounded border border-level-3 bg-level-1 px-3 py-2 text-level-5 focus:border-accent focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={handleCreateWallet}
                disabled={actionLoading}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-level-1 hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? 'Creating…' : 'Create wallet'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-level-2 border border-level-3 p-4 space-y-3">
            <label className="text-sm text-level-4 block">
              Select a wallet
              <select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                className="mt-1 block w-full rounded border border-level-3 bg-level-1 px-3 py-2 text-level-5 focus:border-accent focus:outline-none"
              >
                <option value="">—</option>
                {wallets.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => selectedWallet && handleLoadWallet(selectedWallet)}
              disabled={actionLoading || !selectedWallet}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-level-1 hover:opacity-90 disabled:opacity-50"
            >
              {actionLoading ? 'Loading…' : 'Load and use this wallet'}
            </button>
          </div>
        )}
      </div>
    );
  }

  const wallet = (data?.wallet ?? {}) as Record<string, unknown>;
  const balance = data?.balance ?? 0;

  return (
    <div className="relative space-y-4">
      <LoadingOverlay show={loading && !!data && getRefreshTabId() === 'wallet'} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-level-2 border border-level-3 p-4">
          <h3 className="text-sm font-medium text-accent mb-2">Wallet</h3>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-level-4">Wallet name</dt>
              <dd className="text-level-5">{String(wallet.walletname ?? 'N/A')}</dd>
            </div>
            <div className="flex justify-between items-center gap-2">
              <dt className="text-level-4 flex items-center gap-1.5">
                Balance
                <button
                  type="button"
                  onClick={() => setBalanceVisible((v) => !v)}
                  className="p-0.5 rounded text-level-4 hover:text-level-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title={balanceVisible ? 'Hide balance' : 'Show balance'}
                  aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
                >
                  {balanceVisible ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </dt>
              <dd className="text-accent tabular-nums">
                {balanceVisible ? `${Number(balance).toFixed(8)} BTC` : '***.**'}
              </dd>
            </div>
            {data?.balances?.mine && (
              <>
                {data.balances.mine.trusted !== null && data.balances.mine.trusted !== undefined && Number.isFinite(data.balances.mine.trusted) && (
                  <div className="flex justify-between">
                    <dt className="text-level-4">Balance (confirmed)</dt>
                    <dd className="text-level-5 tabular-nums">
                      {balanceVisible ? `${Number(data.balances.mine.trusted).toFixed(8)} BTC` : '***.**'}
                    </dd>
                  </div>
                )}
                {data.balances.mine.untrusted_pending !== null && data.balances.mine.untrusted_pending !== undefined && Number.isFinite(data.balances.mine.untrusted_pending) && data.balances.mine.untrusted_pending !== 0 && (
                  <div className="flex justify-between">
                    <dt className="text-level-4">Pending</dt>
                    <dd className="text-level-5 tabular-nums">
                      {balanceVisible ? `${Number(data.balances.mine.untrusted_pending).toFixed(8)} BTC` : '***.**'}
                    </dd>
                  </div>
                )}
                {data.balances.mine.immature !== null && data.balances.mine.immature !== undefined && Number.isFinite(data.balances.mine.immature) && data.balances.mine.immature !== 0 && (
                  <div className="flex justify-between">
                    <dt className="text-level-4">Immature</dt>
                    <dd className="text-level-5 tabular-nums">
                      {balanceVisible ? `${Number(data.balances.mine.immature).toFixed(8)} BTC` : '***.**'}
                    </dd>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <dt className="text-level-4" title="Distinct transactions in the wallet (from getwalletinfo)">Tx count</dt>
              <dd className="text-level-5">{wallet.txcount !== null && wallet.txcount !== undefined ? String(wallet.txcount) : 'N/A'}</dd>
            </div>
            {wallet.walletversion !== null && wallet.walletversion !== undefined && (
              <div className="flex justify-between">
                <dt className="text-level-4">Wallet version</dt>
                <dd className="text-level-5">{String(wallet.walletversion)}</dd>
              </div>
            )}
            {wallet.keypoolsize !== null && wallet.keypoolsize !== undefined && (
              <div className="flex justify-between">
                <dt className="text-level-4">Keypool size</dt>
                <dd className="text-level-5">{String(wallet.keypoolsize)}</dd>
              </div>
            )}
            {wallet.avoid_reuse !== null && wallet.avoid_reuse !== undefined && (
              <div className="flex justify-between">
                <dt className="text-level-4">Avoid reuse</dt>
                <dd className="text-level-5">{wallet.avoid_reuse === true ? 'Yes' : 'No'}</dd>
              </div>
            )}
            {wallet.scanning !== null && wallet.scanning !== undefined && (
              <div className="flex justify-between">
                <dt className="text-level-4">Scanning</dt>
                <dd className="text-level-5">
                  {typeof wallet.scanning === 'object' && typeof (wallet.scanning as { progress?: number }).progress === 'number'
                    ? `${(wallet.scanning as { progress?: number }).progress}%`
                    : 'Rescanning…'}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="rounded-lg bg-level-2 border border-level-3 overflow-hidden">
        <h3 className="text-sm font-medium text-accent p-4 pb-2">UTXOs ({unspent.length})</h3>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="sortable-table w-full text-sm">
            <thead className="sticky top-0 bg-level-2 text-left">
              <tr>
                <SortableTh label="Txid" sortKey="txid" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Vout" sortKey="vout" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Address" sortKey="address" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Amount (BTC)" sortKey="amount" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Confirmations" sortKey="confirmations" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="px-2 py-3 text-level-4" />
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
                unspentSort.sortedData.map((utxo, i) => (
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
        <h3 className="text-sm font-medium text-accent p-4 pb-2" title="listtransactions can return multiple entries per transaction (e.g. per address or category), so this count may exceed Tx count.">
          Transactions ({transactions.length} entries)
        </h3>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="sortable-table w-full text-sm">
            <thead className="sticky top-0 bg-level-2 text-left">
              <tr>
                <SortableTh label="Txid" sortKey="txid" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Category" sortKey="category" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Address" sortKey="address" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Amount (BTC)" sortKey="amount" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Confirmations" sortKey="confirmations" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Time" sortKey="time" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="px-2 py-3 text-level-4" />
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr className="border-t border-level-3">
                  <td colSpan={6} className="p-4 text-center text-level-4">
                    No transactions
                  </td>
                </tr>
              ) : (
                transactionsSort.sortedData.map((tx, i) => (
                  <tr
                    key={`${tx.txid ?? ''}-${tx.vout ?? ''}-${i}`}
                    className="border-t border-level-3 hover:bg-level-3"
                  >
                    <td className="p-2 text-level-5 font-mono" title={tx.txid ?? ''}>
                      {truncateTxid(tx.txid)}
                    </td>
                    <td className="p-2 text-level-5">{tx.category ?? '-'}</td>
                    <td className="p-2 max-w-[200px] truncate text-level-5" title={tx.address ?? ''}>
                      {tx.address ?? '-'}
                    </td>
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
