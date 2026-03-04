import { useEffect, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useApi } from '@/contexts/ApiContext';
import type { BlockRow, BlocksData, DistributionData } from '@/types';
import { formatBytes, formatWeight } from '@/utils';
import { useConsole } from '@/contexts/ConsoleContext';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { LoadingOverlay } from '@/components/LoadingOverlay';

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
            src={`/icons/pools/${pool.icon}`}
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
      <div className="flex items-center justify-center h-[240px] text-level-4 text-sm">
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
          <Legend wrapperStyle={{ fontSize: 12 }} />
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
    return <div className="p-4 text-level-4">Loading blockchain data...</div>;
  }

  if (error && !data) {
    return (
      <div className="p-4 text-red-400">
        Error loading blocks: {error.message}. Make sure the API server is running.
      </div>
    );
  }

  const blocks = data?.blocks ?? [];
  const latestBlock = blocks.length > 0 ? (blocks[0] as BlockRow) : null;
  const chainHeight = data?.chain_height ?? null;
  const nextBlockHeight = chainHeight !== null && chainHeight !== undefined ? chainHeight + 1 : null;
  const secondsSinceLastBlock = data?.seconds_since_last_block ?? null;
  const timeSinceLastFormatted =
    secondsSinceLastBlock !== null && secondsSinceLastBlock !== undefined && secondsSinceLastBlock >= 0
      ? `${secondsSinceLastBlock}s`
      : '-';

  return (
    <div className="relative space-y-4">
      <LoadingOverlay show={loading && !!data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg bg-level-2 border border-level-3 p-4 space-y-4">
          <section>
            <h3 className="text-sm font-medium text-level-4 mb-3">Current block (being searched)</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-level-4">Next block</dt>
              <dd className="text-level-5 font-medium tabular-nums">
                {nextBlockHeight !== null ? `#${nextBlockHeight.toLocaleString()}` : '-'}
              </dd>
              <dt className="text-level-4">Status</dt>
              <dd className="text-level-5">Not yet found</dd>
              <dt className="text-level-4">Time since last block</dt>
              <dd className="text-level-5 tabular-nums">{timeSinceLastFormatted}</dd>
            </dl>
          </section>
          <section>
            <h3 className="text-sm font-medium text-level-4 mb-3">Latest found block</h3>
            {latestBlock ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-level-4">Height</dt>
                <dd className="text-level-5 font-medium tabular-nums">{latestBlock.block_height}</dd>
                <dt className="text-level-4">Hash</dt>
                <dd className="text-level-5 font-mono text-xs truncate" title={latestBlock.block_hash}>{latestBlock.block_hash ?? '-'}</dd>
                <dt className="text-level-4">Time</dt>
                <dd className="text-level-5">{latestBlock.block_time ?? '-'}</dd>
                <dt className="text-level-4">Time since previous</dt>
                <dd className="text-level-5">{latestBlock.time_since_last_block || '-'}</dd>
                <dt className="text-level-4">Pool</dt>
                <dd className="text-level-5">
                  <PoolCell identifier={latestBlock.mining_pool} poolByIdentifier={poolByIdentifier} iconSize={POOL_ICON_SIZE} />
                </dd>
                <dt className="text-level-4">Tx count</dt>
                <dd className="text-level-5 tabular-nums">{latestBlock.transaction_count ?? '-'}</dd>
                <dt className="text-level-4">Weight</dt>
                <dd className="text-level-5 tabular-nums">{formatWeight(latestBlock.block_weight as number | undefined)}</dd>
                <dt className="text-level-4">Size</dt>
                <dd className="text-level-5 tabular-nums">{formatBytes(latestBlock.block_size as number | undefined)}</dd>
                <dt className="text-level-4">Reward</dt>
                <dd className="text-level-5 tabular-nums">{latestBlock.block_reward !== null && latestBlock.block_reward !== undefined ? Number(latestBlock.block_reward).toFixed(4) : '-'}</dd>
                <dt className="text-level-4">Fees</dt>
                <dd className="text-level-5 tabular-nums">{latestBlock.total_fees !== null && latestBlock.total_fees !== undefined ? Number(latestBlock.total_fees).toFixed(4) : '-'}</dd>
                <dt className="text-level-4">Fees (USD)</dt>
                <dd className="text-level-5 tabular-nums">{latestBlock.total_fees_usd !== null && latestBlock.total_fees_usd !== undefined ? Number(latestBlock.total_fees_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</dd>
              </dl>
            ) : (
              <p className="text-sm text-level-4">No block data</p>
            )}
          </section>
        </div>
        <div className="rounded-lg bg-level-2 border border-level-3 p-4">
          <h3 className="text-sm font-medium text-level-4 mb-3">Pool distribution</h3>
          <PoolDistributionChart distribution={distribution ?? null} poolByIdentifier={poolByIdentifier} />
        </div>
      </div>

      <div className="rounded-lg bg-level-2 border border-level-3 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-level-2 text-left">
              <tr>
                <th className="p-2 text-level-4">Height</th>
                <th className="p-2 text-level-4">Time</th>
                <th className="p-2 text-level-4">Pool</th>
                <th className="p-2 text-level-4">Tx Count</th>
                <th className="p-2 text-level-4">Weight</th>
                <th className="p-2 text-level-4">Size</th>
                <th className="p-2 text-level-4">Reward</th>
                <th className="p-2 text-level-4">Fees</th>
                <th className="p-2 text-level-4">Fees (USD)</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr
                  key={block.block_height}
                  className="border-t border-level-3 hover:bg-level-3"
                >
                  <td className="p-2 text-level-5">{block.block_height}</td>
                  <td className="p-2 text-level-5">{block.block_time ?? '-'}</td>
                  <td className="p-2 max-w-[160px] text-level-5">
                    <PoolCell
                      identifier={block.mining_pool}
                      poolByIdentifier={poolByIdentifier}
                      iconSize={POOL_ICON_SIZE}
                    />
                  </td>
                  <td className="p-2 text-level-5">{block.transaction_count ?? '-'}</td>
                  <td className="p-2 text-level-5 tabular-nums">{formatWeight(block.block_weight as number | undefined)}</td>
                  <td className="p-2 text-level-5 tabular-nums">{formatBytes(block.block_size as number | undefined)}</td>
                  <td className="p-2 text-level-5 tabular-nums">{block.block_reward !== null && block.block_reward !== undefined ? Number(block.block_reward).toFixed(4) : '-'}</td>
                  <td className="p-2 text-level-5 tabular-nums">{block.total_fees !== null && block.total_fees !== undefined ? Number(block.total_fees).toFixed(4) : '-'}</td>
                  <td className="p-2 text-level-5 tabular-nums">{block.total_fees_usd !== null && block.total_fees_usd !== undefined ? Number(block.total_fees_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
