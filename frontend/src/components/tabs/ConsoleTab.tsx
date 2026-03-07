import { useState, useCallback } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { SectionHeader } from '@/components/SectionHeader';
import { formatResponseForDisplay } from '@/utils';
import { RPC_COMMANDS_BY_CATEGORY, getCommandDescription, getSampleParams } from '@/data/rpcCommands';

const DEFAULT_COLLAPSED = new Set(['Wallet', 'Util', 'Raw transactions']);

export function ConsoleTab() {
  const { callRpc } = useApi();
  const [method, setMethod] = useState('getblockchaininfo');
  const [paramsStr, setParamsStr] = useState('[]');
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(DEFAULT_COLLAPSED));

  const toggleCategory = useCallback((category: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const handleCommandClick = useCallback((cmd: string) => {
    setMethod(cmd);
    setParamsStr(getSampleParams(cmd));
  }, []);

  const handleExecute = useCallback(async () => {
    setError(null);
    setResponse(null);
    let params: unknown[];
    try {
      params = JSON.parse(paramsStr) as unknown[];
      if (!Array.isArray(params)) {
        throw new Error('Params must be a JSON array');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid params JSON');
      return;
    }

    const trimmedMethod = method.trim();
    if (!trimmedMethod) {
      setError('Method is required');
      return;
    }

    setLoading(true);
    try {
      const result = await callRpc(trimmedMethod, params);
      setResponse(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [callRpc, method, paramsStr]);

  return (
    <div className="space-y-4">
      <div className="card">
        <SectionHeader>RPC Commands</SectionHeader>
        <div className="section-container">
        {Object.entries(RPC_COMMANDS_BY_CATEGORY).map(([category, commands]) => {
          const isCollapsed = collapsed.has(category);
          return (
            <div key={category} className="mb-3 last:mb-0">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="method-list-link"
                aria-expanded={!isCollapsed}
              >
                <span
                  className="inline-block transition-transform"
                  style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none' }}
                  aria-hidden
                >
                  ▼
                </span>
                {category}
              </button>
              {!isCollapsed && (
                <div className="flex flex-wrap gap-1.5">
                  {commands.map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => handleCommandClick(cmd)}
                      className={`px-2 py-1 rounded text-sm  border transition ${method === cmd
                        ? 'text-accent border-accent'
                        : 'bg-level-2 text-level-5 border-level-3 hover:border-accent hover:text-accent'
                        }`}
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        <div className="flex-[1] min-w-0 card">
          <SectionHeader>RPC Console</SectionHeader>
          <div className="section-container">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 items-start">
              <div className="min-w-0 flex-grow">
                <label htmlFor="rpc-method" className="form-label-muted">
                  Method
                </label>
                <div className="flex flex-col gap-1.5 w-full border border-level-3 rounded-md p-2">
                  <input
                    id="rpc-method"
                    type="text"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExecute();
                      }
                    }}
                    className="form-input form-input-mono min-w-[22ch] w-full max-w-md"
                    placeholder="getblockcount"
                  />
                  <p className="text-caption">
                    {getCommandDescription(method) || '—'}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="rpc-params" className="form-label-muted">
                Params (JSON array)
              </label>
              <textarea
                id="rpc-params"
                value={paramsStr}
                onChange={(e) => setParamsStr(e.target.value)}
                rows={3}
                className="form-input form-input-mono resize-y"
                placeholder='[]'
                spellCheck={false}
              />
            </div>
            <button
              type="button"
              onClick={handleExecute}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Executing…' : 'Execute'}
            </button>
          </div>
          </div>
        </div>

        <div className="flex-[2] min-w-0 card">
          <SectionHeader>Response</SectionHeader>
          <div className="section-container">
          <div className="p-3 font-mono text-sm overflow-x-auto flex-1 min-h-[120px]">
            {error !== null ? (
              <pre className="text-semantic-error whitespace-pre-wrap break-words">{error}</pre>
            ) : response !== null ? (
              <pre className="text-level-5 whitespace-pre-wrap break-words">
                {formatResponseForDisplay(response)}
              </pre>
            ) : (
              <p className="text-muted">Response will appear here after Execute.</p>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
