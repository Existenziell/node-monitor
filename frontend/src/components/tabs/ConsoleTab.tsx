import { useState, useCallback } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { RPC_COMMANDS_BY_CATEGORY, getSampleParams } from '@/data/rpcCommands';

export function ConsoleTab() {
  const { callRpc } = useApi();
  const [method, setMethod] = useState('getmininginfo');
  const [paramsStr, setParamsStr] = useState('[]');
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
      <div className="rounded border border-green-500/30 bg-black/80 overflow-hidden">
        <div className="px-3 py-2 border-b border-green-500/30">
          <h3 className="text-sm font-medium text-gray-400">RPC commands — click to set Method</h3>
        </div>
        <div className="p-3 max-h-48 overflow-y-auto">
          {Object.entries(RPC_COMMANDS_BY_CATEGORY).map(([category, commands]) => (
            <div key={category} className="mb-3 last:mb-0">
              <h4 className="text-xs font-medium text-gold/80 mb-1.5">{category}</h4>
              <div className="flex flex-wrap gap-1.5">
                {commands.map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => handleCommandClick(cmd)}
                    className={`px-2 py-1 rounded text-xs font-mono border transition ${
                      method === cmd
                        ? 'bg-gold/20 text-gold border-gold/40'
                        : 'bg-white/5 text-gray-400 border-green-500/20 hover:border-green-500/40 hover:text-green-400'
                    }`}
                    title={`Set method to ${cmd}`}
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border border-green-500/30 bg-black/80 p-4">
        <h3 className="text-gold font-medium mb-3">RPC Console</h3>
        <p className="text-sm text-gray-400 mb-4">
          Send a JSON-RPC command to your Bitcoin node. Method (e.g. getblockcount, getblockhash) and params as a JSON array.
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="rpc-method" className="block text-sm text-gray-400 mb-1">
              Method
            </label>
            <input
              id="rpc-method"
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded border border-green-500/30 bg-black/90 px-3 py-2 font-mono text-sm text-green-400 focus:border-gold/50 focus:outline-none"
              placeholder="getblockcount"
            />
          </div>
          <div>
            <label htmlFor="rpc-params" className="block text-sm text-gray-400 mb-1">
              Params (JSON array)
            </label>
            <textarea
              id="rpc-params"
              value={paramsStr}
              onChange={(e) => setParamsStr(e.target.value)}
              rows={3}
              className="w-full rounded border border-green-500/30 bg-black/90 px-3 py-2 font-mono text-sm text-green-400 focus:border-gold/50 focus:outline-none resize-y"
              placeholder='[]'
              spellCheck={false}
            />
          </div>
          <button
            type="button"
            onClick={handleExecute}
            disabled={loading}
            className="px-4 py-2 rounded font-medium bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Executing…' : 'Execute'}
          </button>
        </div>
      </div>

      {(response !== null || error !== null) && (
        <div className="rounded border border-green-500/30 bg-black/80 overflow-hidden">
          <div className="px-3 py-2 border-b border-green-500/30 text-sm font-medium text-gray-400">
            Response
          </div>
          <div className="p-3 font-mono text-sm overflow-x-auto">
            {error !== null ? (
              <pre className="text-red-400 whitespace-pre-wrap break-words">{error}</pre>
            ) : response !== null ? (
              <pre className="text-green-400 whitespace-pre-wrap break-words">
                {JSON.stringify(response, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
