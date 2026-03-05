import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { useConsole } from '@/contexts/ConsoleContext';
import { DEFAULT_RPC_HOST, DEFAULT_RPC_PORT } from '@/constants';
import { SectionHeader } from '@/components/SectionHeader';
import type { ConfigStatus, ConfigSavePayload, ConfigTestResult } from '@/types';
import { getErrorMessage } from '@/utils';

/** Baseline values from last load/save for dirty checking. rpcUser is null when masked. */
interface SettingsBaseline {
  authMethod: 'password' | 'cookie';
  rpcHost: string;
  rpcPort: string;
  rpcUser: string | null;
  cookieFile: string;
  hasPassword: boolean;
}

interface PendingChange {
  field: string;
  from?: string;
  to?: string;
  sensitive?: boolean;
}

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
  const { fetchConfigStatus, fetchConfigTest, saveConfig } = useApi();
  const { log } = useConsole();
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<ConfigTestResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSaved, setLastSaved] = useState<SettingsBaseline | null>(null);

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
    } catch (e) {
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
      log(`Settings: could not load config status: ${getErrorMessage(e)}`, 'warning');
    } finally {
      setLoading(false);
    }
  }, [fetchConfigStatus, log]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

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
      <div className="rounded-lg bg-level-2 border border-level-3 p-4 max-w-xl">
        <SectionHeader as="h2">Node configuration</SectionHeader>
        {status && !status.config_exists && (
          <p className="text-level-5 text-sm mb-4">
            No configuration found. Enter RPC credentials or cookie path to connect to your Bitcoin
            node.
          </p>
        )}
        {message && (
          <div
            className={`mb-4 p-2 rounded text-sm ${
              message.type === 'success'
                ? 'bg-semantic-success/20 text-semantic-success'
                : 'bg-semantic-error/20 text-semantic-error'
            }`}
          >
            {message.text}
          </div>
        )}
        {status?.config_exists && (
          <p className="text-sm text-level-4 mb-4">
            Default wallet: {status.wallet_name !== null && status.wallet_name !== undefined && status.wallet_name !== '' ? status.wallet_name : 'None'}
          </p>
        )}
        <div className="mb-4 flex flex-wrap items-center gap-2">
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
            className="rounded border border-level-3 bg-level-2 px-3 py-2 text-sm font-medium text-level-5 hover:bg-level-3 disabled:opacity-50"
          >
            {testLoading ? 'Testing…' : 'Test connection'}
          </button>
          {testResult && !testLoading && (
            <span className={`text-sm ${testResult.ok ? 'text-semantic-success' : 'text-semantic-error'}`}>
              {testResult.ok
                ? `Connected${testResult.version ? ` (${testResult.version})` : ''}`
                : `Connection failed: ${testResult.error ?? 'Unknown error'}`}
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-level-5 mb-1">
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
                <label htmlFor="rpc_user" className="block text-sm font-medium text-level-5 mb-1">
                  RPC Username
                </label>
                <input
                  id="rpc_user"
                  type="text"
                  value={rpcUser}
                  onChange={(e) => setRpcUser(e.target.value)}
                  className="w-full rounded border border-level-3 bg-level-2 px-3 py-2 text-level-5"
                  placeholder={status?.rpc_user_masked ? `${status.rpc_user_masked} (current)` : 'bitcoinrpc'}
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="rpc_password" className="block text-sm font-medium text-level-5 mb-1">
                  RPC Password
                </label>
                <input
                  id="rpc_password"
                  type="password"
                  value={rpcPassword}
                  onChange={(e) => setRpcPassword(e.target.value)}
                  className="w-full rounded border border-level-3 bg-level-2 px-3 py-2 text-level-5"
                  placeholder={status?.config_exists ? 'Leave blank to keep current' : 'Required'}
                  autoComplete="current-password"
                />
              </div>
            </>
          )}

          {authMethod === 'cookie' && (
            <div>
              <label htmlFor="cookie_file" className="block text-sm font-medium text-level-5 mb-1">
                Cookie file path
              </label>
              <input
                id="cookie_file"
                type="text"
                value={cookieFile}
                onChange={(e) => setCookieFile(e.target.value)}
                className="w-full rounded border border-level-3 bg-level-2 px-3 py-2 text-level-5 font-mono text-sm"
                placeholder="e.g. /home/user/.bitcoin/.cookie"
              />
            </div>
          )}

          <div>
            <label htmlFor="rpc_host" className="block text-sm font-medium text-level-5 mb-1">
              RPC Host
            </label>
            <input
              id="rpc_host"
              type="text"
              value={rpcHost}
              onChange={(e) => setRpcHost(e.target.value)}
              className="w-full rounded border border-level-3 bg-level-2 px-3 py-2 text-level-5"
              placeholder={`${DEFAULT_RPC_HOST} or Bitcoin node IP/hostname`}
            />
          </div>

          <div>
            <label htmlFor="rpc_port" className="block text-sm font-medium text-level-5 mb-1">
              RPC Port
            </label>
            <input
              id="rpc_port"
              type="number"
              min={1024}
              max={65535}
              value={rpcPort}
              onChange={(e) => setRpcPort(e.target.value)}
              className="w-full rounded border border-level-3 bg-level-2 px-3 py-2 text-level-5"
            />
          </div>

          {lastSaved && (
            <div className="rounded-lg border border-level-3 bg-level-2 p-3">
              <SectionHeader>Pending changes</SectionHeader>
              {hasPendingChanges ? (
                <ul className="text-sm text-level-4 space-y-1 list-disc list-inside">
                  {pendingChanges.map((c, i) => (
                    <li key={i}>
                      {c.field}: {c.from !== null && c.from !== undefined ? `${c.from} → ` : ''}{c.to ?? ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-level-4">No pending changes</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !hasPendingChanges}
            title={!hasPendingChanges ? 'No changes to save' : undefined}
            className="px-4 py-2 rounded font-medium bg-accent text-accent-foreground border border-accent hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}
