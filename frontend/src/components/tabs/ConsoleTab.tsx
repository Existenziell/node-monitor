import { useState, useCallback } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { SectionHeader } from '@/components/SectionHeader';
import { RPC_COMMANDS_BY_CATEGORY, getSampleParams } from '@/data/rpcCommands';

const DEFAULT_COLLAPSED = new Set(['Wallet', 'Util', 'Raw transactions']);

/** Unescape common JSON string sequences so long messages (e.g. RPC help) render readably. */
function unescapeForDisplay(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"');
}

/** Pretty-print a value for the response panel, with readable multi-line strings. */
function formatResponseForDisplay(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);

  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);

  if (typeof value === 'string') {
    const decoded = unescapeForDisplay(value);
    if (decoded.includes('\n')) {
      const lines = decoded.split('\n');
      return '\n' + lines.map((line) => padInner + line).join('\n');
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => padInner + formatResponseForDisplay(v, indent + 1).trimStart());
    return '[\n' + items.join(',\n') + '\n' + pad + ']';
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const lines = entries.map(([k, v]) => {
      const formatted = formatResponseForDisplay(v, indent + 1);
      const key = JSON.stringify(k);
      const multiLine = typeof v === 'string' && formatted.startsWith('\n');
      const valuePart = multiLine ? formatted : formatted.trimStart();
      return padInner + key + ': ' + valuePart;
    });
    return '{\n' + lines.join(',\n') + '\n' + pad + '}';
  }

  return String(value);
}

export function ConsoleTab() {
  const { callRpc } = useApi();
  const [method, setMethod] = useState('getmininginfo');
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
      <div className="section-container">
          <SectionHeader>RPC commands</SectionHeader>
          {Object.entries(RPC_COMMANDS_BY_CATEGORY).map(([category, commands]) => {
            const isCollapsed = collapsed.has(category);
            return (
              <div key={category} className="mb-3 last:mb-0">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-1.5 w-full text-left text-xs font-medium text-accent hover:text-accent-hover transition-colors mb-1.5"
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
                        className={`px-2 py-1 rounded text-xs font-mono border transition ${
                          method === cmd
                            ? 'text-accent border-accent'
                            : 'bg-level-2 text-level-4 border-level-3 hover:border-accent hover:text-accent'
                        }`}
                        title={`Set method to ${cmd}`}
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

      <div className="flex gap-4 flex-col lg:flex-row">
        <div className="flex-1 min-w-0 section-container">
          <SectionHeader>RPC Console</SectionHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="rpc-method" className="block text-sm text-level-4 mb-1">
                Method
              </label>
              <input
                id="rpc-method"
                type="text"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded border border-level-3 bg-level-2 px-3 py-2 font-mono text-sm text-level-5 focus:border-accent focus:outline-none"
                placeholder="getblockcount"
              />
            </div>
            <div>
              <label htmlFor="rpc-params" className="block text-sm text-level-4 mb-1">
                Params (JSON array)
              </label>
              <textarea
                id="rpc-params"
                value={paramsStr}
                onChange={(e) => setParamsStr(e.target.value)}
                rows={3}
                className="w-full rounded border border-level-3 bg-level-2 px-3 py-2 font-mono text-sm text-level-5 focus:border-accent focus:outline-none resize-y"
                placeholder='[]'
                spellCheck={false}
              />
            </div>
            <button
              type="button"
              onClick={handleExecute}
              disabled={loading}
              className="px-4 py-2 rounded font-medium bg-accent text-accent-foreground border border-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Executing…' : 'Execute'}
            </button>
          </div>
        </div>

        <div className="section-container">
          <SectionHeader>Response</SectionHeader>
          <div className="p-3 font-mono text-sm overflow-x-auto flex-1 min-h-[120px]">
            {error !== null ? (
              <pre className="text-semantic-error whitespace-pre-wrap break-words">{error}</pre>
            ) : response !== null ? (
              <pre className="text-level-5 whitespace-pre-wrap break-words">
                {formatResponseForDisplay(response)}
              </pre>
            ) : (
              <p className="text-level-4 text-sm">Response will appear here after Execute.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
