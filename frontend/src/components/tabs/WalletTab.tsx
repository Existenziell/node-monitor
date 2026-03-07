import { useCallback, useMemo, useState } from 'react';
import { useApi } from '@/contexts/ApiContext';
import type { BtcPrices, UtxoEntry, WalletData, WalletTransaction } from '@/types';
import { API_SERVER_HINT } from '@/constants';
import { formatHash, formatPrice, formatTxTime, getErrorMessage } from '@/utils';
import { useRefreshState, useRefreshDoneMulti } from '@/contexts/RefreshContext';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { useTableSort } from '@/hooks/useTableSort';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { LoadingErrorGate } from '@/components/LoadingErrorGate';
import { Spinner } from '@/components/Spinner';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { SectionHeader } from '@/components/SectionHeader';
import { SortableTh } from '@/components/SortableTh';
import { WalletConfig } from '@/components/WalletConfig';
import { BtcPriceChart } from '@/components/BtcPriceChart';
import { EyeIcon, EyeSlashIcon } from '@/components/Icons';

export function WalletTab() {
  const { fetchWallet, fetchPrice, fetchPriceHistory, callRpc, saveWalletName } = useApi();
  const { data, loading, error, load } = useApiData<WalletData>(fetchWallet);
  const { data: priceData, loading: priceLoading, load: loadPrice } = useApiData<BtcPrices>(fetchPrice);
  const { data: priceHistory, loading: priceHistoryLoading, load: loadPriceHistory } = useApiData(
    fetchPriceHistory
  );

  const loadAll = useCallback(
    () => Promise.all([load(), loadPrice(), loadPriceHistory()]),
    [load, loadPrice, loadPriceHistory]
  );

  const hasData = data !== null && data !== undefined;
  useTabData(loadAll, 'wallet', hasData);
  useRefreshDoneMulti([loading, priceLoading, priceHistoryLoading], 'wallet');

  const { refreshTabId } = useRefreshState();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createPassphrase, setCreatePassphrase] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [balanceVisible, setBalanceVisible] = useState(true);
  /** Selected BIP44/BIP84 account index, or 'all' when multiple accounts. */
  const [selectedAccount, setSelectedAccount] = useState<number | 'all'>('all');

  const accounts = useMemo(
    () => (Array.isArray(data?.accounts) ? data.accounts : []),
    [data?.accounts]
  );
  const hasMultipleAccounts = accounts.length > 1;

  /** Resolve account index to display label (custom label or "Account N"). */
  const accountDisplayName = useCallback(
    (accountIndex: number | null | undefined): string => {
      if (accountIndex === null || accountIndex === undefined) return '-';
      const a = accounts.find((x) => x.index === accountIndex);
      return a ? ((a.label && a.label.trim()) ? a.label : `Account ${a.index}`) : `Account ${accountIndex}`;
    },
    [accounts]
  );

  const unspentRaw: UtxoEntry[] = useMemo(
    () => (Array.isArray(data?.unspent) ? data.unspent : []),
    [data?.unspent]
  );
  const transactionsRaw: WalletTransaction[] = useMemo(
    () => (Array.isArray(data?.transactions) ? data.transactions : []),
    [data?.transactions]
  );

  const unspent: UtxoEntry[] = useMemo(() => {
    if (!hasMultipleAccounts || selectedAccount === 'all') return unspentRaw;
    return unspentRaw.filter((u) => u.accountIndex === selectedAccount);
  }, [hasMultipleAccounts, selectedAccount, unspentRaw]);

  const transactions: WalletTransaction[] = useMemo(() => {
    if (!hasMultipleAccounts || selectedAccount === 'all') return transactionsRaw;
    return transactionsRaw.filter((t) => t.accountIndex === selectedAccount);
  }, [hasMultipleAccounts, selectedAccount, transactionsRaw]);
  /** Receives for the selected account (for BTC price chart purchase dots). */
  const receives = useMemo(
    () =>
      transactions.filter(
        (t) => t.category === 'receive' && (t.amount === null || t.amount === undefined || Number(t.amount) > 0)
      ),
    [transactions]
  );
  const unspentSort = useTableSort<UtxoEntry>({
    data: unspent,
    keyExtractors: {
      txid: (u) => (u.txid ?? '') || null,
      vout: (u) => (u.vout !== null && u.vout !== undefined ? u.vout : null),
      address: (u) => (u.address ?? '') || null,
      label: (u) => (u.label ?? '') || null,
      amount: (u) => (u.amount !== null && u.amount !== undefined && Number.isFinite(u.amount) ? u.amount : null),
      confirmations: (u) => (u.confirmations !== null && u.confirmations !== undefined ? u.confirmations : null),
      spendable: (u) => (u.spendable === true ? 1 : u.spendable === false ? 0 : null),
      safe: (u) => (u.safe === true ? 1 : u.safe === false ? 0 : null),
      accountIndex: (u) => (u.accountIndex !== null && u.accountIndex !== undefined ? u.accountIndex : null),
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
      accountIndex: (t) => (t.accountIndex !== null && t.accountIndex !== undefined ? t.accountIndex : null),
    },
    defaultSortKey: 'confirmations',
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
  const balance = useMemo(() => {
    if (selectedAccount === 'all' || !hasMultipleAccounts) return data?.balance ?? 0;
    const breakdown = data?.balancesPerAccount?.[String(selectedAccount)];
    if (!breakdown) return 0;
    const t = Number(breakdown.trusted) || 0;
    const p = Number(breakdown.untrusted_pending) || 0;
    const i = Number(breakdown.immature) || 0;
    return t + p + i;
  }, [data?.balance, data?.balancesPerAccount, hasMultipleAccounts, selectedAccount]);

  return (
    <LoadingErrorGate
      loading={false}
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
                <div className="card">
                  <div className="section-container space-y-4">
                  <p className="text-level-4">No wallets found. Create one to get started.</p>
                  <div className="flex flex-col gap-3 max-w-sm">
                    <label className="text-muted">
                      Wallet name
                      <input
                        type="text"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="e.g. mywallet"
                        className="form-input form-input-surface-1 mt-1 block"
                      />
                    </label>
                    <label className="text-muted">
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
                </div>
              ) : (
                <div className="card">
                  <div className="section-container space-y-3">
                  <label className="text-muted block">
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
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="relative space-y-4">
          <LoadingOverlay show={(loading || priceLoading) && !!data && refreshTabId === 'wallet'} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <SectionHeader>Balance</SectionHeader>
              <div className="section-container">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="tabular-nums text-accent min-w-0">
                    {balanceVisible ? (
                      loading || !data ? (
                        <div className="flex items-center gap-2 text-level-4">
                          <Spinner size="sm" className="flex-shrink-0" />
                          <span>Loading…</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl md:text-3xl lg:text-4xl font-medium">
                            {Number(balance).toFixed(8)} BTC
                          </div>
                          <div className="text-base md:text-lg text-level-4 mt-0.5">
                            {Math.round(balance * 100_000_000).toLocaleString()} sats
                          </div>
                          <div className="text-base md:text-lg text-level-4 mt-0.5 flex items-center gap-2">
                            {priceLoading && (priceData === null || priceData === undefined) ? (
                              <>
                                <Spinner size="sm" className="flex-shrink-0" />
                                <span>Loading…</span>
                              </>
                            ) : (
                              formatPrice(
                                priceData?.USD !== null && priceData?.USD !== undefined && Number.isFinite(priceData.USD)
                                  ? balance * priceData.USD
                                  : undefined
                              )
                            )}
                          </div>
                        </>
                      )
                    ) : (
                      <>
                        <div className="text-2xl md:text-3xl lg:text-4xl font-medium">****</div>
                        <div className="text-base md:text-lg text-level-4">****</div>
                        <div className="text-base md:text-lg text-level-4">****</div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBalanceVisible((v) => !v)}
                    className="icon-button-muted shrink-0"
                    title={balanceVisible ? 'Hide balance' : 'Show balance'}
                    aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
                  >
                    {balanceVisible ? (
                      <EyeSlashIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {(() => {
                  const breakdown = selectedAccount === 'all' ? data?.balances?.mine : data?.balancesPerAccount?.[String(selectedAccount)];
                  if (!breakdown) return null;
                  const trusted = breakdown.trusted !== null && breakdown.trusted !== undefined && Number.isFinite(breakdown.trusted);
                  const pending = breakdown.untrusted_pending !== null && breakdown.untrusted_pending !== undefined && Number.isFinite(breakdown.untrusted_pending) && breakdown.untrusted_pending !== 0;
                  const immature = breakdown.immature !== null && breakdown.immature !== undefined && Number.isFinite(breakdown.immature) && breakdown.immature !== 0;
                  const fmt = (btc: number) => balanceVisible ? `${Number(btc).toFixed(8)} BTC` : '****';
                  return (
                    <div className="text-muted mt-2 pt-2 border-t border-level-3 space-y-1">
                      {trusted && (
                        <div>
                          Confirmed: {balanceVisible ? `${Number(breakdown.trusted).toFixed(8)} BTC` : '****'}
                        </div>
                      )}
                      {pending && (
                        <div>Pending: {fmt(Number(breakdown.untrusted_pending))}</div>
                      )}
                      {immature && (
                        <div>Immature: {fmt(Number(breakdown.immature))}</div>
                      )}
                    </div>
                  );
                })()}
              </div>
              </div>
            </div>
            <div className="card">
              <SectionHeader>Wallet</SectionHeader>
              <div className="section-container">
              <dl className="text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-level-4" title={hasMultipleAccounts && selectedAccount !== 'all' ? 'Transaction count for selected account (from list)' : 'Distinct transactions in the wallet (from getwalletinfo)'}>Tx count</dt>
                  <dd className="text-level-5">
                    {hasMultipleAccounts && selectedAccount !== 'all'
                      ? String(transactions.length)
                      : wallet.txcount !== null && wallet.txcount !== undefined
                        ? String(wallet.txcount)
                        : 'N/A'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-level-4" title={hasMultipleAccounts && selectedAccount !== 'all' ? 'Unspent outputs for selected account' : 'Unspent outputs in the wallet'}>UTXO count</dt>
                  <dd className="text-level-5">{String(unspent.length)}</dd>
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
            <div className="card">
              <SectionHeader>Config</SectionHeader>
              <div className="section-container">
              <WalletConfig
                walletLabel="Active wallet"
                loadedWallets={data?.loadedWallets ?? []}
                walletName={String(wallet.walletname ?? '')}
                onWalletChange={async (name) => {
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
                walletLoading={actionLoading}
                walletError={actionError}
                accounts={data?.accounts ?? null}
                selectedAccount={selectedAccount}
                onAccountChange={setSelectedAccount}
                showWalletDropdown={(data?.loadedWallets?.length ?? 0) > 1}
              />
              </div>
            </div>
          </div>

          <CollapsibleSection id="btc-price" title="BTC Price">
            <BtcPriceChart
              priceHistory={priceHistory ?? []}
              receives={receives}
              loading={priceHistoryLoading}
            />
          </CollapsibleSection>

          <CollapsibleSection id="utxos" title={`UTXOs (${unspent.length})`}>
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="sortable-table w-full text-sm">
                <thead className="sticky top-0 bg-level-2 text-left">
                  <tr>
                    <SortableTh label="Txid" sortKey="txid" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="table-th" />
                    <SortableTh label="Vout" sortKey="vout" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="table-th" />
                    <SortableTh label="Address" sortKey="address" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="table-th" />
                    <SortableTh label="Label" sortKey="label" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="table-th" />
                    <SortableTh label="Amount (BTC)" sortKey="amount" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="table-th" />
                    <SortableTh label="Confirmations" sortKey="confirmations" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="table-th" />
                    <SortableTh label="Spendable" sortKey="spendable" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="table-th" />
                    <SortableTh label="Safe" sortKey="safe" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="table-th" />
                    {hasMultipleAccounts && selectedAccount === 'all' && (
                      <SortableTh label="Account" sortKey="accountIndex" currentSortKey={unspentSort.sortKey} sortDir={unspentSort.sortDir} onSort={unspentSort.setSort} className="table-th" />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading || !data ? (
                    <tr>
                      <td colSpan={hasMultipleAccounts && selectedAccount === 'all' ? 9 : 8} className="p-4 text-center text-muted" role="status" aria-live="polite">
                        <span className="inline-flex items-center justify-center gap-2">
                          <Spinner size="sm" aria-hidden={false} className="flex-shrink-0" />
                          <span>Loading UTXOs…</span>
                        </span>
                      </td>
                    </tr>
                  ) : unspent.length === 0 ? (
                    <tr className="border-t border-level-3">
                      <td colSpan={hasMultipleAccounts && selectedAccount === 'all' ? 9 : 8} className="p-4 text-center text-level-4">
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
                          {formatHash(utxo.txid)}
                        </td>
                        <td className="p-2 text-level-5">{utxo.vout ?? '-'}</td>
                        <td className="p-2 max-w-[200px] truncate text-level-5 font-mono" title={utxo.address ?? ''}>
                          {formatHash(utxo.address)}
                        </td>
                        <td className="p-2 max-w-[120px] truncate text-level-5" title={utxo.label ?? ''}>
                          {(utxo.label ?? '').trim() || '-'}
                        </td>
                        <td className="p-2 text-level-5">
                          {utxo.amount !== null && utxo.amount !== undefined && Number.isFinite(utxo.amount) ? Number(utxo.amount).toFixed(8) : '-'}
                        </td>
                        <td className="p-2 text-level-5">{utxo.confirmations ?? '-'}</td>
                        <td className="p-2 text-level-5">{utxo.spendable === true ? 'Yes' : utxo.spendable === false ? 'No' : '-'}</td>
                        <td className="p-2 text-level-5">{utxo.safe === true ? 'Yes' : utxo.safe === false ? 'No' : '-'}</td>
                        {hasMultipleAccounts && selectedAccount === 'all' && (
                          <td className="p-2 text-level-5">{accountDisplayName(utxo.accountIndex)}</td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          <CollapsibleSection id="transactions" title={`Transactions (${transactions.length})`}>
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="sortable-table w-full text-sm">
                <thead className="sticky top-0 bg-level-2 text-left">
                  <tr>
                    <SortableTh label="Txid" sortKey="txid" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="table-th" />
                    <SortableTh label="Category" sortKey="category" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="table-th" />
                    <SortableTh label="Address" sortKey="address" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="table-th" />
                    <SortableTh label="Amount (BTC)" sortKey="amount" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="table-th" />
                    <SortableTh label="Confirmations" sortKey="confirmations" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="table-th" />
                    <SortableTh label="Time" sortKey="time" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="table-th" />
                    {hasMultipleAccounts && selectedAccount === 'all' && (
                      <SortableTh label="Account" sortKey="accountIndex" currentSortKey={transactionsSort.sortKey} sortDir={transactionsSort.sortDir} onSort={transactionsSort.setSort} className="table-th" />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading || !data ? (
                    <tr>
                      <td colSpan={hasMultipleAccounts && selectedAccount === 'all' ? 7 : 6} className="p-4 text-center text-muted" role="status" aria-live="polite">
                        <span className="inline-flex items-center justify-center gap-2">
                          <Spinner size="sm" aria-hidden={false} className="flex-shrink-0" />
                          <span>Loading transactions…</span>
                        </span>
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr className="border-t border-level-3">
                      <td colSpan={hasMultipleAccounts && selectedAccount === 'all' ? 7 : 6} className="p-4 text-center text-level-4">
                        No transactions
                      </td>
                    </tr>
                  ) : (
                    transactionsSort.sortedData.map((tx, i) => (
                      <tr
                        key={`${tx.txid ?? ''}-${tx.vout ?? ''}-${i}`}
                        className="table-row-hover cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (tx.txid) {
                            window.open(`https://mempool.space/tx/${tx.txid}`, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && tx.txid) {
                            e.preventDefault();
                            window.open(`https://mempool.space/tx/${tx.txid}`, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      >
                        <td className="p-2 text-level-5 font-mono" title={tx.txid ?? ''}>
                          {formatHash(tx.txid)}
                        </td>
                        <td className="p-2 text-level-5">{tx.category ?? '-'}</td>
                        <td className="p-2 max-w-[200px] truncate text-level-5 font-mono" title={tx.address ?? ''}>
                          {formatHash(tx.address)}
                        </td>
                        <td className="p-2 text-level-5">
                          {tx.amount !== null && tx.amount !== undefined && Number.isFinite(tx.amount) ? Number(tx.amount).toFixed(8) : '-'}
                        </td>
                        <td className="p-2 text-level-5">{tx.confirmations ?? '-'}</td>
                        <td className="p-2 text-level-5">{formatTxTime(tx)}</td>
                        {hasMultipleAccounts && selectedAccount === 'all' && (
                          <td className="p-2 text-level-5">{accountDisplayName(tx.accountIndex)}</td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        </div>
      )}
    </LoadingErrorGate>
  );
}
