import { useEffect } from 'react';
import { useApi } from '@/contexts/ApiContext';
import type { BlockRow, BlocksData } from '@/types';
import { useConsole } from '@/contexts/ConsoleContext';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';

export function BlocksTab() {
  const { fetchBlocks } = useApi();
  const { data, loading, error, load } = useApiData<BlocksData>(fetchBlocks);
  const { log } = useConsole();

  useTabData(load, 'blocks');

  useEffect(() => {
    if (data?.blocks?.length && data.blocks[0]) {
      const b = data.blocks[0] as BlockRow;
      log(`Latest block: #${b.block_height} (${b.mining_pool ?? 'unknown'})`, 'block-found');
    }
  }, [data, log]);

  if (loading && !data) {
    return <div className="p-4 text-gray-600 dark:text-gray-400">Loading blockchain data...</div>;
  }

  if (error && !data) {
    return (
      <div className="p-4 text-red-400 dark:text-red-400">
        Error loading blocks: {error.message}. Make sure the API server is running.
      </div>
    );
  }

  const blocks = data?.blocks ?? [];
  const avgTx =
    blocks.length > 0
      ? Math.round(
          blocks.reduce((s, b) => s + Number(b.transaction_count ?? 0), 0) / blocks.length
        )
      : 0;
  const avgFees =
    blocks.length > 0
      ? blocks.reduce((s, b) => s + Number(b.total_fees ?? 0), 0) / blocks.length
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 p-4">
          <div className="text-2xl font-bold text-accent-light dark:text-gold">-</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Block Time</div>
        </div>
        <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 p-4">
          <div className="text-2xl font-bold text-accent-light dark:text-gold">{avgTx.toLocaleString()}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Transaction Count</div>
        </div>
        <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 p-4">
          <div className="text-2xl font-bold text-accent-light dark:text-gold">{avgFees.toFixed(4)}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Fees</div>
        </div>
      </div>

      <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-100 dark:bg-black/80 text-left">
              <tr>
                <th className="p-2 text-gray-700 dark:text-gray-400">Height</th>
                <th className="p-2 text-gray-700 dark:text-gray-400">Time</th>
                <th className="p-2 text-gray-700 dark:text-gray-400">Pool</th>
                <th className="p-2 text-gray-700 dark:text-gray-400">Tx Count</th>
                <th className="p-2 text-gray-700 dark:text-gray-400">Fees</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr
                  key={block.block_height}
                  className="border-t border-gray-200 dark:border-gold/10 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <td className="p-2 text-gray-900 dark:text-gray-300">{block.block_height}</td>
                  <td className="p-2 text-gray-900 dark:text-gray-300">{block.block_time ?? '-'}</td>
                  <td className="p-2 truncate max-w-[120px] text-gray-900 dark:text-gray-300">{block.mining_pool ?? '-'}</td>
                  <td className="p-2 text-gray-900 dark:text-gray-300">{block.transaction_count ?? '-'}</td>
                  <td className="p-2 text-gray-900 dark:text-gray-300">{Number(block.total_fees ?? 0).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
