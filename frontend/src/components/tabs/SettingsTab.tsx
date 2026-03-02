import React, { useCallback, useEffect, useState } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { useConsole } from '@/contexts/ConsoleContext';
import type { ConfigStatus, ConfigSavePayload } from '@/types';

export function SettingsTab() {
  const { fetchConfigStatus, saveConfig } = useApi();
  const { log } = useConsole();
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [authMethod, setAuthMethod] = useState<'password' | 'cookie'>('password');
  const [rpcUser, setRpcUser] = useState('');
  const [rpcPassword, setRpcPassword] = useState('');
  const [rpcPort, setRpcPort] = useState('8332');
  const [cookieFile, setCookieFile] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const s = await fetchConfigStatus();
      setStatus(s);
      setAuthMethod(s.auth_method === 'cookie' ? 'cookie' : 'password');
      setRpcPort(String(s.rpc_port ?? 8332));
      setCookieFile(s.cookie_file ?? '');
      if (s.rpc_user_masked) {
        setRpcUser('');
      }
    } catch (e) {
      setStatus({
        config_exists: false,
        auth_method: null,
        rpc_port: null,
        rpc_user_masked: null,
        cookie_file: null,
        node_configured: false,
      });
      log(`Settings: could not load config status: ${(e as Error).message}`, 'warning');
    } finally {
      setLoading(false);
    }
  }, [fetchConfigStatus, log]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setMessage(null);
      const payload: ConfigSavePayload = {
        auth_method: authMethod,
        rpc_port: parseInt(rpcPort, 10) || 8332,
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
          loadStatus();
        } else {
          setMessage({ type: 'error', text: result.error ?? 'Save failed' });
        }
      } catch (e) {
        setMessage({ type: 'error', text: (e as Error).message });
      } finally {
        setSaving(false);
      }
    },
    [authMethod, rpcPort, rpcUser, rpcPassword, cookieFile, saveConfig, loadStatus]
  );

  if (loading && !status) {
    return (
      <div className="p-4 text-gray-600 dark:text-gray-400">Loading settings...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 p-4 max-w-xl">
        <h2 className="text-lg font-medium text-accent-light dark:text-gold mb-4">Node configuration</h2>
        {status && !status.config_exists && (
          <p className="text-amber-700 dark:text-gold/90 text-sm mb-4">
            No configuration found. Enter RPC credentials or cookie path to connect to your Bitcoin
            node.
          </p>
        )}
        {message && (
          <div
            className={`mb-4 p-2 rounded text-sm ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-800 dark:text-green-300'
                : 'bg-red-500/20 text-red-800 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Authentication
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="auth_method"
                  checked={authMethod === 'password'}
                  onChange={() => setAuthMethod('password')}
                  className="rounded border-gray-300 dark:border-gold/40"
                />
                <span className="text-sm">Username / Password</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="auth_method"
                  checked={authMethod === 'cookie'}
                  onChange={() => setAuthMethod('cookie')}
                  className="rounded border-gray-300 dark:border-gold/40"
                />
                <span className="text-sm">Cookie file</span>
              </label>
            </div>
          </div>

          {authMethod === 'password' && (
            <>
              <div>
                <label htmlFor="rpc_user" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  RPC Username
                </label>
                <input
                  id="rpc_user"
                  type="text"
                  value={rpcUser}
                  onChange={(e) => setRpcUser(e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gold/30 bg-white dark:bg-white/10 px-3 py-2 text-gray-900 dark:text-gray-100"
                  placeholder="bitcoinrpc"
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="rpc_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  RPC Password
                </label>
                <input
                  id="rpc_password"
                  type="password"
                  value={rpcPassword}
                  onChange={(e) => setRpcPassword(e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gold/30 bg-white dark:bg-white/10 px-3 py-2 text-gray-900 dark:text-gray-100"
                  placeholder={status?.config_exists ? 'Leave blank to keep current' : 'Required'}
                  autoComplete="current-password"
                />
              </div>
            </>
          )}

          {authMethod === 'cookie' && (
            <div>
              <label htmlFor="cookie_file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cookie file path
              </label>
              <input
                id="cookie_file"
                type="text"
                value={cookieFile}
                onChange={(e) => setCookieFile(e.target.value)}
                className="w-full rounded border border-gray-300 dark:border-gold/30 bg-white dark:bg-white/10 px-3 py-2 text-gray-900 dark:text-gray-100 font-mono text-sm"
                placeholder="e.g. /home/user/.bitcoin/.cookie"
              />
            </div>
          )}

          <div>
            <label htmlFor="rpc_port" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              RPC Port
            </label>
            <input
              id="rpc_port"
              type="number"
              min={1024}
              max={65535}
              value={rpcPort}
              onChange={(e) => setRpcPort(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gold/30 bg-white dark:bg-white/10 px-3 py-2 text-gray-900 dark:text-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded font-medium bg-accent-light dark:bg-gold/30 text-white dark:text-gold border border-accent-light dark:border-gold/50 hover:bg-blue-700 dark:hover:bg-gold/40 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}
