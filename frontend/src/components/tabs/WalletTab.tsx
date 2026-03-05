import { useMemo, useState } from 'react';
import { useApi } from '@/contexts/ApiContext';
import type { UtxoEntry, WalletData, WalletTransaction } from '@/types';
import { API_SERVER_HINT } from '@/constants';
import { formatTxTime, getErrorMessage, truncateTxid } from '@/utils';
import { getRefreshTabId } from '@/refreshState';
import { useClearRefreshOnDone } from '@/hooks/useClearRefreshOnDone';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { useTableSort } from '@/hooks/useTableSort';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { LoadingErrorGate } from '@/components/LoadingErrorGate';
import { SectionHeader } from '@/components/SectionHeader';
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

  useClearRefreshOnDone(loading, 'wallet');

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
      const alreadyLoaded =
        data?.noWallet === true &&
        (data?.wallets?.includes(name) || data?.loadedWallets?.includes(name));
      if (!alreadyLoaded) {
        const res = await callRpc('loadwallet', [name]);
        const err = (res as { error?: unknown })?.error;
        if (err !== null && err !== undefined) {
          throw new Error(getErrorMessage(err));
        }
      }
      const save = await saveWalletName(name);
      if (!save.ok) throw new Error(save.error ?? 'Failed to save wallet');
      await load();
    } catch (e) {
      setActionError(getErrorMessage(e));
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
        throw new Error(getErrorMessage(err));
      }
      const save = await saveWalletName(name);
      if (!save.ok) throw new Error(save.error ?? 'Failed to save wallet');
      setCreateName('');
      setCreatePassphrase('');
      await load();
    } catch (e) {
      setActionError(getErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  const wallet = (data?.wallet ?? {}) as Record<string, unknown>;
  const balance = data?.balance ?? 0;

  return (
    <LoadingErrorGate
      loading={loading}
      error={error}
      data={data}
      loadingLabel="wallet"
      errorHint={`${API_SERVER_HINT} A wallet must be loaded.`}
    >
    {data?.noWallet === true ? (
      (() => {
        const wallets = Array.isArray(data.wallets) ? data.wallets : [];
        return (
          <div className="space-y-4 p-4">
            <p className="text-level-4">No wallet is loaded. Choose a wallet to load and use.</p>
            {actionError && (
              <div className="callout-error">
                {actionError}
              </div>
            )}
            {wallets.length === 0 ? (
              <div className="section-container space-y-4">
                <p className="text-level-4">No wallets found. Create one to get started.</p>
                <div className="flex flex-col gap-3 max-w-sm">
                  <label className="text-sm text-level-4">
                    Wallet name
                    <input
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. mywallet"
                      className="form-input form-input-surface-1 mt-1 block"
                    />
                  </label>
                  <label className="text-sm text-level-4">
                    Passphrase (optional)
                    <input
                      type="password"
                      value={createPassphrase}
                      onChange={(e) => setCreatePassphrase(e.target.value)}
                      placeholder="Leave empty for no encryption"
                      className="form-input form-input-surface-1 mt-1 block"
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
              <div className="section-container space-y-3">
                <label className="text-sm text-level-4 block">
                  Select a wallet
                  <select
                    value={selectedWallet}
                    onChange={(e) => setSelectedWallet(e.target.value)}
                    className="form-input form-input-surface-1 mt-1 block"
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
      })()
    ) : (
    <div className="relative space-y-4">
      <LoadingOverlay show={loading && !!data && getRefreshTabId() === 'wallet'} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="section-container">
          <SectionHeader>Config</SectionHeader>
          {(data?.loadedWallets?.length ?? 0) > 1 && (
            <div className="mb-4">
              <label className="form-label-muted">Active wallet</label>
              <select
                value={String(wallet.walletname ?? '')}
                onChange={async (e) => {
                  const name = e.target.value;
                  if (!name || name === wallet.walletname) return;
                  setActionError(null);
                  setActionLoading(true);
                  try {
                    const save = await saveWalletName(name);
                    if (!save.ok) throw new Error(save.error ?? 'Failed to save wallet');
                    await load();
                  } catch (err) {
                    setActionError(getErrorMessage(err));
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="form-input form-input-surface-1"
              >
                {(data?.loadedWallets ?? []).map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              {actionError && (
                <p className="mt-1 text-sm text-semantic-error">{actionError}</p>
              )}
            </div>
          )}
          <dl className="text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-level-4">Wallet name</dt>
              <dd className="text-level-5">{String(wallet.walletname ?? 'N/A')}</dd>
            </div>
          </dl>
        </div>
        <div className="section-container">
          <SectionHeader>Wallet</SectionHeader>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between items-center gap-2">
              <dt className="text-level-4 flex items-center gap-1.5">
                Balance
                <button
                  type="button"
                  onClick={() => setBalanceVisible((v) => !v)}
                  className="icon-button-muted"
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
            {typeof wallet.scanning === 'object' &&
              wallet.scanning !== null &&
              typeof (wallet.scanning as { progress?: number }).progress === 'number' && (
              <div className="flex justify-between">
                <dt className="text-level-4">Scanning</dt>
                <dd className="text-level-5">
                  {(wallet.scanning as { progress: number }).progress}%
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="section-container">
        <SectionHeader>UTXOs ({unspent.length})</SectionHeader>
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
                    className="table-row-hover"
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

      <div className="section-container">
        <SectionHeader>
          Transactions ({transactions.length})
        </SectionHeader>
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
                    className="table-row-hover"
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
    )}
    </LoadingErrorGate>
  );
}
