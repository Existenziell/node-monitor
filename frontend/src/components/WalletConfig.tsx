import type { WalletConfigProps } from '@/types';

export function WalletConfig({
  walletLabel,
  loadedWallets,
  walletName,
  onWalletChange,
  walletLoading = false,
  walletError = null,
  walletSwitchMessage = null,
  accounts,
  accountsLoading = false,
  selectedAccount = 'all',
  onAccountChange,
  allowNoWallet = false,
  showWalletDropdown = true,
  showAccountSection = true,
}: WalletConfigProps) {
  const hasAccounts = Array.isArray(accounts) && accounts.length >= 1;
  const hasMultipleAccounts = Array.isArray(accounts) && accounts.length > 1;
  const accountDropdown = hasMultipleAccounts && onAccountChange !== null && onAccountChange !== undefined;

  return (
    <div className="space-y-2">
      {showWalletDropdown && (
        <div>
          <label className="form-label-muted">{walletLabel}</label>
          {loadedWallets.length > 0 ? (
            <select
              value={walletName}
              onChange={(e) => {
                const v = e.target.value;
                onWalletChange(v === '' ? null : v);
              }}
              disabled={walletLoading}
              className="form-input form-input-surface-1 mt-1 block"
            >
              {allowNoWallet && <option value="">None</option>}
              {loadedWallets.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-level-4 mt-1">
              {walletName || 'None'}
            </p>
          )}
          {walletError && (
            <p className="mt-1 text-sm text-semantic-error">{walletError}</p>
          )}
          {walletSwitchMessage !== null && walletSwitchMessage !== undefined && (
            <div className="mt-2 p-2 rounded text-sm bg-semantic-success/20 text-semantic-success">
              Wallet switched to {walletSwitchMessage}
            </div>
          )}
        </div>
      )}

      {showAccountSection && (
        <div>
          <label className="form-label-muted">Account (derivation path)</label>
          {accountsLoading ? (
            <p className="text-sm text-level-5 mt-1">Loading…</p>
          ) : hasAccounts ? (
            accountDropdown ? (
              <select
                value={selectedAccount === 'all' ? 'all' : String(selectedAccount)}
                onChange={(e) => {
                  const v = e.target.value;
                  onAccountChange(v === 'all' ? 'all' : parseInt(v, 10));
                }}
                className="form-input form-input-surface-1 mt-1 block"
              >
                <option value="all">All accounts</option>
                {(accounts ?? []).map((a) => (
                  <option key={a.index} value={String(a.index)}>
                    Account {a.index}{a.path ? ` (${a.path})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <ul className="text-sm text-level-5 mt-1 space-y-1 list-none">
                {(accounts ?? []).map((a) => (
                  <li key={a.index}>
                    Account {a.index}
                    {a.path ? ` — ${a.path}` : ''}
                  </li>
                ))}
              </ul>
            )
          ) : accounts !== undefined && accounts !== null ? (
            <p className="text-sm text-level-5 mt-1">
              No paths detected — descriptors may not include BIP32 account paths
              {onAccountChange === null || onAccountChange === undefined ? '.' : ' (see listdescriptors in Console).'}
            </p>
          ) : null}
        </div>
      )}

    </div>
  );
}
