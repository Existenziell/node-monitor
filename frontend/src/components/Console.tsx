import { useRef, useEffect } from 'react';
import { useConsole } from '@/contexts/ConsoleContext';

const logTypeClasses: Record<string, string> = {
  info: 'text-console-info',
  success: 'text-console-success',
  warning: 'text-console-warning',
  error: 'text-console-error',
  'data-fetch': 'text-console-data',
  webserver: 'text-console-webserver',
  'block-found': 'text-accent',
};

export function Console() {
  const { lines, clear, connectionStatus } = useConsole();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines]);

  return (
    <div className="rounded border border-level-3 bg-level-2 mb-4">
      <div className="flex items-center justify-between px-3 py-2 border-b border-level-3">
        <span className="text-sm font-medium text-level-5">System Console</span>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-semantic-success' : 'bg-semantic-error'
            }`}
            title={connectionStatus}
          />
          <button
            type="button"
            onClick={clear}
            className="px-2 py-1 text-sm rounded hover:bg-level-3"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="h-32 overflow-y-auto p-2 font-mono text-sm bg-level-2">
        {lines.length === 0 ? (
          <div className="text-level-4">[No messages]</div>
        ) : (
          lines.map((line) => (
            <div key={line.id} className="flex gap-2 py-0.5">
              <span className="text-level-4 shrink-0">[{line.timestamp}]</span>
              <span className={logTypeClasses[line.type] ?? 'text-accent'}>
                {line.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
