import { useEffect, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useApi } from '@/contexts/ApiContext';
import type { BlockRow, BlocksData, DistributionData } from '@/types';
import { formatBytes, formatDuration, formatWeight } from '@/utils';
import { useConsole } from '@/contexts/ConsoleContext';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';

const PIE_COLORS = [
  'oklch(0.55 0.2 250)',
  'oklch(0.65 0.2 85)',
  'oklch(0.6 0.18 160)',
  'oklch(0.55 0.22 300)',
  'oklch(0.7 0.15 200)',
  'oklch(0.6 0.2 30)',
  'oklch(0.5 0.2 180)',
  'oklch(0.65 0.18 280)',
  'oklch(0.55 0.15 140)',
  'oklch(0.6 0.2 340)',
  'oklch(0.5 0.18 220)',
  'oklch(0.7 0.12 60)',
];

const POOL_ICON_SIZE = 20;

function PoolCell({
  identifier,
  poolByIdentifier,
  iconSize,
}: {
  identifier: string | undefined;
  poolByIdentifier: Map<string, { name: string; icon?: string }>;
  iconSize: number;
}) {
  const pool = identifier ? poolByIdentifier.get(identifier) : undefined;
  const displayName = pool?.name ?? identifier ?? '-';
  return (
    <div className="flex items-center gap-1.5 min-h-[20px]">
      <span
        className="flex shrink-0 items-center justify-center"
        style={{ width: iconSize, height: iconSize }}
        aria-hidden
      >
        {pool?.icon ? (
          <img
            src={`/data/icons/pools/${pool.icon}`}
            alt=""
            width={iconSize}
            height={iconSize}
            className="object-contain"
            loading="lazy"
          />
        ) : null}
      </span>
      <span className="truncate">{displayName}</span>
    </div>
  );
}

function PoolDistributionChart({
  distribution,
  poolByIdentifier,
}: {
  distribution: DistributionData | null;
  poolByIdentifier: Map<string, { name: string; icon?: string }>;
}) {
  const pieData = useMemo(() => {
    if (!distribution?.by_percentage) return [];
    return Object.entries(distribution.by_percentage)
      .filter(([, pct]) => Number.isFinite(pct) && pct > 0)
      .map(([identifier, value]) => ({
        name: poolByIdentifier.get(identifier)?.name ?? identifier,
        value: Number(value),
      }))
      .sort((a, b) => b.value - a.value);
  }, [distribution, poolByIdentifier]);

  if (pieData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-gray-500 dark:text-gray-400 text-sm">
        No distribution data
      </div>
    );
  }

  return (
    <div className="w-full h-[240px]" role="img" aria-label="Pool distribution by block share">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="70%"
          >
            {pieData.map((_, index) => (
              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg, rgba(255,255,255,0.95))',
              border: '1px solid var(--tooltip-border, #e5e7eb)',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BlocksTab() {
  const { fetchBlocks, fetchPools, fetchDistribution } = useApi();
  const { data, loading, error, load } = useApiData<BlocksData>(fetchBlocks);
  const { data: pools, load: loadPools } = useApiData(fetchPools);
  const { data: distribution, load: loadDistribution } = useApiData(fetchDistribution);
  const { log } = useConsole();

  useTabData(load, 'blocks');

  useEffect(() => {
    loadPools().catch(() => {});
  }, [loadPools]);

  useEffect(() => {
    loadDistribution().catch(() => {});
  }, [loadDistribution]);

  const poolByIdentifier = useMemo(() => {
    const map = new Map<string, { name: string; icon?: string }>();
    if (!pools) return map;
    for (const p of pools) {
      map.set(p.identifier, { name: p.name, icon: p.icon });
    }
    return map;
  }, [pools]);

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
  const avgBlockTimeSeconds = data?.avg_block_time_seconds ?? null;
  const avgBlockTimeDisplay =
    avgBlockTimeSeconds && avgBlockTimeSeconds > 0
      ? formatDuration(avgBlockTimeSeconds)
      : '-';
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
          <div className="text-2xl font-bold text-accent-light dark:text-gold">
            {avgBlockTimeDisplay}
          </div>
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

      <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-400 mb-3">Pool distribution</h3>
        <PoolDistributionChart distribution={distribution ?? null} poolByIdentifier={poolByIdentifier} />
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
                <th className="p-2 text-gray-700 dark:text-gray-400">Weight</th>
                <th className="p-2 text-gray-700 dark:text-gray-400">Size</th>
                <th className="p-2 text-gray-700 dark:text-gray-400">Reward</th>
                <th className="p-2 text-gray-700 dark:text-gray-400">Fees</th>
                <th className="p-2 text-gray-700 dark:text-gray-400">Fees (USD)</th>
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
                  <td className="p-2 max-w-[160px] text-gray-900 dark:text-gray-300">
                    <PoolCell
                      identifier={block.mining_pool}
                      poolByIdentifier={poolByIdentifier}
                      iconSize={POOL_ICON_SIZE}
                    />
                  </td>
                  <td className="p-2 text-gray-900 dark:text-gray-300">{block.transaction_count ?? '-'}</td>
                  <td className="p-2 text-gray-900 dark:text-gray-300 tabular-nums">{formatWeight(block.block_weight as number | undefined)}</td>
                  <td className="p-2 text-gray-900 dark:text-gray-300 tabular-nums">{formatBytes(block.block_size as number | undefined)}</td>
                  <td className="p-2 text-gray-900 dark:text-gray-300 tabular-nums">{block.block_reward !== null && block.block_reward !== undefined ? Number(block.block_reward).toFixed(4) : '-'}</td>
                  <td className="p-2 text-gray-900 dark:text-gray-300 tabular-nums">{block.total_fees !== null && block.total_fees !== undefined ? Number(block.total_fees).toFixed(4) : '-'}</td>
                  <td className="p-2 text-gray-900 dark:text-gray-300 tabular-nums">{block.total_fees_usd !== null && block.total_fees_usd !== undefined ? Number(block.total_fees_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
