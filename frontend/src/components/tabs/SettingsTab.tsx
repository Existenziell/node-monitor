import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { useActiveTab } from '@/contexts/TabContext';
import { DEFAULT_RPC_HOST, DEFAULT_RPC_PORT } from '@/constants';
import { SectionHeader } from '@/components/SectionHeader';
import type { ConfigStatus, ConfigSavePayload, ConfigTestResult, PendingChange, SettingsBaseline } from '@/types';
import { getErrorMessage } from '@/utils';

function getPendingChanges(
  baseline: SettingsBaseline | null,
  current: {
    authMethod: 'password' | 'cookie';
    rpcHost: string;
    rpcPort: string;
    rpcUser: string;
    rpcPassword: string;
    cookieFile: string;
  }
): PendingChange[] {
  if (!baseline) return [];
  const changes: PendingChange[] = [];
  const authLabel = (v: 'password' | 'cookie') => (v === 'password' ? 'Username / Password' : 'Cookie file');

  if (baseline.authMethod !== current.authMethod) {
    changes.push({
      field: 'Authentication',
      from: authLabel(baseline.authMethod),
      to: authLabel(current.authMethod),
    });
  }
  const trim = (s: string) => (s || '').trim();
  if (trim(baseline.rpcHost) !== trim(current.rpcHost)) {
    changes.push({ field: 'RPC Host', from: baseline.rpcHost || DEFAULT_RPC_HOST, to: current.rpcHost || DEFAULT_RPC_HOST });
  }
  const normPort = (s: string) => String(parseInt(s, 10) || Number(DEFAULT_RPC_PORT));
  if (normPort(baseline.rpcPort) !== normPort(current.rpcPort)) {
    changes.push({ field: 'RPC Port', from: baseline.rpcPort, to: current.rpcPort });
  }
  const trimHost = (s: string) => (s || '').trim();
  if (current.authMethod === 'password') {
    const baseUser = baseline.rpcUser ?? '';
    if (trimHost(baseUser) !== trimHost(current.rpcUser)) {
      changes.push({
        field: 'RPC Username',
        from: baseline.rpcUser !== null ? baseline.rpcUser : 'Not configured',
        to: current.rpcUser || 'Not configured',
      });
    }
    if (current.rpcPassword) {
      changes.push({
        field: 'RPC Password',
        to: 'will be updated',
        sensitive: true,
      });
    }
  }
  if (current.authMethod === 'cookie' && trimHost(baseline.cookieFile) !== trimHost(current.cookieFile)) {
    changes.push({
      field: 'Cookie file path',
      from: baseline.cookieFile || 'Not set',
      to: current.cookieFile || 'Not set',
    });
  }
  return changes;
}

export function SettingsTab() {
  const { activeTab } = useActiveTab();
  const { fetchConfigStatus, fetchConfigTest, saveConfig, saveWalletName } = useApi();
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<ConfigTestResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSaved, setLastSaved] = useState<SettingsBaseline | null>(null);
  const [walletSaveLoading, setWalletSaveLoading] = useState(false);
  const [walletSwitchMessage, setWalletSwitchMessage] = useState<string | null>(null);

  const [authMethod, setAuthMethod] = useState<'password' | 'cookie'>('password');
  const [rpcHost, setRpcHost] = useState(DEFAULT_RPC_HOST);
  const [rpcUser, setRpcUser] = useState('');
  const [rpcPassword, setRpcPassword] = useState('');
  const [rpcPort, setRpcPort] = useState(DEFAULT_RPC_PORT);
  const [cookieFile, setCookieFile] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const s = await fetchConfigStatus();
      setStatus(s);
      const method = s.auth_method === 'cookie' ? 'cookie' : 'password';
      const host = (s.rpc_host ?? DEFAULT_RPC_HOST).trim() || DEFAULT_RPC_HOST;
      const port = String(s.rpc_port ?? DEFAULT_RPC_PORT);
      const cookie = s.cookie_file ?? '';
      setAuthMethod(method);
      setRpcHost(host);
      setRpcPort(port);
      setCookieFile(cookie);
      if (s.rpc_user_masked) {
        setRpcUser('');
      }
      setLastSaved({
        authMethod: method,
        rpcHost: host,
        rpcPort: port,
        rpcUser: null,
        cookieFile: cookie,
        hasPassword: !!(s.config_exists && s.auth_method === 'password'),
      });
    } catch {
      const fallback: ConfigStatus = {
        config_exists: false,
        auth_method: null,
        rpc_host: null,
        rpc_port: null,
        rpc_user_masked: null,
        cookie_file: null,
        wallet_name: null,
        node_configured: false,
      };
      setStatus(fallback);
      setLastSaved({
        authMethod: 'password',
        rpcHost: DEFAULT_RPC_HOST,
        rpcPort: DEFAULT_RPC_PORT,
        rpcUser: null,
        cookieFile: '',
        hasPassword: false,
      });
    } finally {
      setLoading(false);
    }
  }, [fetchConfigStatus]);

  // Refetch config status when the Settings tab becomes visible so "Default wallet" stays in sync
  // (e.g. after loading a wallet in the Wallet tab).
  useEffect(() => {
    if (activeTab === 'settings') {
      loadStatus();
    }
  }, [activeTab, loadStatus]);

  // Clear "wallet switched to X" message after 3 seconds
  useEffect(() => {
    if (walletSwitchMessage === null) return;
    const t = setTimeout(() => setWalletSwitchMessage(null), 3000);
    return () => clearTimeout(t);
  }, [walletSwitchMessage]);

  const pendingChanges = useMemo(
    () =>
      getPendingChanges(lastSaved, {
        authMethod,
        rpcHost,
        rpcPort,
        rpcUser,
        rpcPassword,
        cookieFile,
      }),
    [lastSaved, authMethod, rpcHost, rpcPort, rpcUser, rpcPassword, cookieFile]
  );
  const hasPendingChanges = pendingChanges.length > 0;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setMessage(null);
      const payload: ConfigSavePayload = {
        auth_method: authMethod,
        rpc_host: rpcHost.trim() || DEFAULT_RPC_HOST,
        rpc_port: parseInt(rpcPort, 10) || Number(DEFAULT_RPC_PORT),
      };
      if (authMethod === 'password') {
        payload.rpc_user = rpcUser.trim() || undefined;
        if (rpcPassword) {
          payload.rpc_password = rpcPassword;
        }
      } else {
        payload.cookie_file = cookieFile.trim() || undefined;
      }
      try {
        const result = await saveConfig(payload);
        if (result.ok) {
          setMessage({ type: 'success', text: 'Configuration saved. Try loading Node tab.' });
          setRpcPassword('');
          setLastSaved({
            authMethod: payload.auth_method,
            rpcHost: payload.rpc_host ?? DEFAULT_RPC_HOST,
            rpcPort: String(payload.rpc_port),
            rpcUser: payload.rpc_user ?? null,
            cookieFile: payload.cookie_file ?? '',
            hasPassword: payload.auth_method === 'password',
          });
          loadStatus();
        } else {
          setMessage({ type: 'error', text: result.error ?? 'Save failed' });
        }
      } catch (e) {
        setMessage({ type: 'error', text: getErrorMessage(e) });
      } finally {
        setSaving(false);
      }
    },
    [authMethod, rpcHost, rpcPort, rpcUser, rpcPassword, cookieFile, saveConfig, loadStatus]
  );

  if (loading && !status) {
    return (
      <div className="p-4 text-level-4">Loading settings...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="section-container w-full lg:w-1/2 flex-1 min-w-0">
          <SectionHeader as="h2">Node configuration</SectionHeader>
          {status && !status.config_exists && (
            <p className="text-level-5 text-sm mb-4">
              No configuration found. Enter RPC credentials or cookie path to connect to your Bitcoin
              node.
            </p>
          )}
          {message && (
            <div
              className={`mb-4 p-2 rounded text-sm ${message.type === 'success'
                ? 'bg-semantic-success/20 text-semantic-success'
                : 'bg-semantic-error/20 text-semantic-error'
                }`}
            >
              {message.text}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">
                Authentication
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="auth_method"
                    checked={authMethod === 'password'}
                    onChange={() => setAuthMethod('password')}
                    className="radio-setting"
                  />
                  <span className="text-sm">Username / Password</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="auth_method"
                    checked={authMethod === 'cookie'}
                    onChange={() => setAuthMethod('cookie')}
                    className="radio-setting"
                  />
                  <span className="text-sm">Cookie file</span>
                </label>
              </div>
            </div>

            {authMethod === 'password' && (
              <>
                <div>
                  <label htmlFor="rpc_user" className="form-label">
                    RPC Username
                  </label>
                  <input
                    id="rpc_user"
                    type="text"
                    value={rpcUser}
                    onChange={(e) => setRpcUser(e.target.value)}
                    className="form-input"
                    placeholder={status?.rpc_user_masked ? `${status.rpc_user_masked} (current)` : 'bitcoinrpc'}
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label htmlFor="rpc_password" className="form-label">
                    RPC Password
                  </label>
                  <input
                    id="rpc_password"
                    type="password"
                    value={rpcPassword}
                    onChange={(e) => setRpcPassword(e.target.value)}
                    className="form-input"
                    placeholder={status?.config_exists ? 'Leave blank to keep current' : 'Required'}
                    autoComplete="current-password"
                  />
                </div>
              </>
            )}

            {authMethod === 'cookie' && (
              <div>
                <label htmlFor="cookie_file" className="form-label">
                  Cookie file path
                </label>
                <input
                  id="cookie_file"
                  type="text"
                  value={cookieFile}
                  onChange={(e) => setCookieFile(e.target.value)}
                  className="form-input form-input-mono"
                  placeholder="e.g. /home/user/.bitcoin/.cookie"
                />
              </div>
            )}

            <div>
              <label htmlFor="rpc_host" className="form-label">
                RPC Host
              </label>
              <input
                id="rpc_host"
                type="text"
                value={rpcHost}
                onChange={(e) => setRpcHost(e.target.value)}
                className="form-input"
                placeholder={`${DEFAULT_RPC_HOST} or Bitcoin node IP/hostname`}
              />
            </div>

            <div>
              <label htmlFor="rpc_port" className="form-label">
                RPC Port
              </label>
              <input
                id="rpc_port"
                type="number"
                min={1024}
                max={65535}
                value={rpcPort}
                onChange={(e) => setRpcPort(e.target.value)}
                className="form-input"
              />
            </div>

            {lastSaved && hasPendingChanges && (
              <div className="rounded-lg border border-level-3 bg-level-2 p-3">
                <SectionHeader>Pending changes</SectionHeader>
                <ul className="text-sm text-level-4 space-y-1 list-disc list-inside">
                  {pendingChanges.map((c, i) => (
                    <li key={i}>
                      {c.field}: {c.from !== null && c.from !== undefined ? `${c.from} → ` : ''}{c.to ?? ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={saving || !hasPendingChanges}
                title={!hasPendingChanges ? 'No changes to save' : undefined}
                className="btn-primary"
              >
                {saving ? 'Saving…' : 'Save configuration'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setTestResult(null);
                  setTestLoading(true);
                  try {
                    const r = await fetchConfigTest();
                    setTestResult(r);
                  } catch (e) {
                    setTestResult({ ok: false, error: getErrorMessage(e) });
                  } finally {
                    setTestLoading(false);
                  }
                }}
                disabled={testLoading}
                className="form-display"
              >
                {testLoading ? 'Testing…' : 'Test connection'}
              </button>
            </div>
            {testResult && !testLoading && (
              <p className={`text-sm ${testResult.ok ? 'text-semantic-success' : 'text-semantic-error'}`}>
                {testResult.ok
                  ? `Connected${testResult.version ? ` (${testResult.version})` : ''}`
                  : `Connection failed: ${testResult.error ?? 'Unknown error'}`}
              </p>
            )}
          </form>
        </div>

        <div className="section-container w-full lg:w-1/2 py-3">
          <SectionHeader as="h2">Wallet configuration</SectionHeader>
          {status?.config_exists && (
            <div className="space-y-2">
              <div>
                <label className="form-label-muted">Default wallet</label>
                {Array.isArray(status.loaded_wallets) ? (
                  <select
                    value={status.wallet_name ?? ''}
                    onChange={async (e) => {
                      const value = e.target.value;
                      const name = value === '' ? null : value;
                      setWalletSaveLoading(true);
                      setMessage(null);
                      try {
                        const result = await saveWalletName(name);
                        if (result.ok) {
                          await loadStatus();
                          window.dispatchEvent(new CustomEvent('tab-refresh', { detail: 'wallet' }));
                          const displayName = name ?? 'None';
                          setWalletSwitchMessage(displayName);
                        } else {
                          setMessage({ type: 'error', text: result.error ?? 'Failed to save default wallet' });
                        }
                      } catch (err) {
                        setMessage({ type: 'error', text: getErrorMessage(err) });
                      } finally {
                        setWalletSaveLoading(false);
                      }
                    }}
                    disabled={walletSaveLoading}
                    className="form-input"
                  >
                    <option value="">None</option>
                    {status.loaded_wallets.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-level-4">
                    {status.wallet_name !== null && status.wallet_name !== undefined && status.wallet_name !== '' ? status.wallet_name : 'None'}
                  </p>
                )}
              </div>
              {walletSwitchMessage !== null && (
                <div className="p-2 rounded text-sm bg-semantic-success/20 text-semantic-success">
                  Wallet switched to {walletSwitchMessage}
                </div>
              )}
            </div>
          )}
          {status?.config_exists === false && (
            <p className="text-sm text-level-4">Save node configuration first to choose a default wallet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
