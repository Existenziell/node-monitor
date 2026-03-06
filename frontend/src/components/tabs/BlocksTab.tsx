import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useApi } from '@/contexts/ApiContext';
import type { BlockRow, BlocksData, DistributionData } from '@/types';
import { formatBytes, formatTimeSince, formatWeight } from '@/utils';
import { useRefreshState, useRefreshDone } from '@/contexts/RefreshContext';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { useTableSort } from '@/hooks/useTableSort';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { LoadingErrorGate } from '@/components/LoadingErrorGate';
import { SectionHeader } from '@/components/SectionHeader';
import { SortableTh } from '@/components/SortableTh';

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

const POOL_ICON_SIZE = 16;

/** Parse block_time UTC string (YYYY-MM-DD HH:mm:ss) to timestamp ms, or null. */
function parseBlockTimeUtc(blockTimeStr: string): number | null {
  if (!blockTimeStr || typeof blockTimeStr !== 'string') return null;
  const ts = Date.parse(blockTimeStr + 'Z');
  return Number.isFinite(ts) ? ts : null;
}

/** Identifier is an "unknown" pool when backend could not match a known pool (e.g. "Unknown Pool (hex...)" or "Solo Miner / Unknown"). */
function isUnknownPoolIdentifier(identifier: string): boolean {
  return identifier.startsWith('Unknown Pool (') || identifier === 'Solo Miner / Unknown';
}

function PoolCell({
  identifier,
  poolByIdentifier,
  iconSize,
}: {
  identifier: string | undefined;
  poolByIdentifier: Map<string, { name: string; icon?: string }>;
  iconSize: number;
}) {
  const pool = identifier
    ? poolByIdentifier.get(identifier) ?? (isUnknownPoolIdentifier(identifier) ? poolByIdentifier.get('unknown') : undefined)
    : undefined;
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
    const sorted = Object.entries(distribution.by_percentage)
      .filter(([, pct]) => Number.isFinite(pct) && pct > 0)
      .map(([identifier, value]) => {
        const pool = poolByIdentifier.get(identifier) ?? (isUnknownPoolIdentifier(identifier) ? poolByIdentifier.get('unknown') : undefined);
        return {
          name: pool?.name ?? identifier,
          value: Number(value),
        };
      })
      .sort((a, b) => b.value - a.value);
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const othersValue = rest.reduce((sum, d) => sum + d.value, 0);
    if (othersValue <= 0) return top5;
    return [...top5, { name: 'Others', value: othersValue }];
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
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={240}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="70%"
            paddingAngle={1}
            stroke="none"
          >
            {pieData.map((_, index) => (
              <Cell
                key={index}
                fill={PIE_COLORS[index % PIE_COLORS.length]}
                stroke="none"
              />
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
  const { refreshTabId } = useRefreshState();

  useTabData(load, 'blocks', data !== null && data !== undefined);

  useRefreshDone(loading, 'blocks');

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
      const entry = { name: p.name, icon: p.icon };
      map.set(p.identifier, entry);
      for (const sig of p.signatures ?? []) {
        map.set(sig, entry);
      }
    }
    return map;
  }, [pools]);

  const blockTimeStr = data?.blocks?.[0]?.block_time ?? null;
  const blockTimestamp = blockTimeStr ? parseBlockTimeUtc(blockTimeStr) : null;
  const apiSecondsSince = data?.seconds_since_last_block;
  const useApiSeconds =
    apiSecondsSince !== null &&
    apiSecondsSince !== undefined &&
    Number.isFinite(apiSecondsSince) &&
    apiSecondsSince >= 0;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick(0);
  }, [blockTimeStr, apiSecondsSince]);

  useEffect(() => {
    if ((blockTimeStr === null || blockTimeStr === undefined) && !useApiSeconds) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [blockTimeStr, useApiSeconds]);

  const elapsedSeconds =
    blockTimestamp !== null ? Math.max(0, (Date.now() - blockTimestamp) / 1000) : null;
  const timeSinceLastFormatted = useApiSeconds
    ? formatTimeSince(Math.floor((apiSecondsSince ?? 0) + tick))
    : elapsedSeconds !== null
      ? formatTimeSince(Math.floor(elapsedSeconds))
      : '-';

  const blocks = data?.blocks ?? [];
  const blocksSort = useTableSort<BlockRow>({
    data: blocks,
    keyExtractors: {
      height: (b) => b.block_height ?? null,
      time: (b) => parseBlockTimeUtc(b.block_time ?? '') ?? null,
      pool: (b) => (b.mining_pool ?? '') || null,
      txCount: (b) => (b.transaction_count !== null && b.transaction_count !== undefined ? b.transaction_count : null),
      weight: (b) => (b.block_weight !== null && b.block_weight !== undefined ? b.block_weight : null),
      size: (b) => (b.block_size !== null && b.block_size !== undefined ? b.block_size : null),
      reward: (b) => (b.block_reward !== null && b.block_reward !== undefined ? b.block_reward : null),
      fees: (b) => (b.total_fees !== null && b.total_fees !== undefined ? b.total_fees : null),
      feesUsd: (b) => (b.total_fees_usd !== null && b.total_fees_usd !== undefined ? b.total_fees_usd : null),
    },
    defaultSortKey: 'height',
    defaultSortDir: 'desc',
  });

  const chainHeight = data?.chain_height ?? null;
  const nextBlockHeight = chainHeight !== null && chainHeight !== undefined ? chainHeight + 1 : null;

  return (
    <LoadingErrorGate loading={loading} error={error} data={data} loadingLabel="blocks">
    <div className="relative space-y-4">
      <LoadingOverlay show={loading && !!data && refreshTabId === 'blocks'} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="section-container">
          <SectionHeader>Current block</SectionHeader>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-level-4">Next block</dt>
              <dd className="text-level-5 font-medium tabular-nums">
                {nextBlockHeight !== null ? `#${nextBlockHeight.toLocaleString()}` : '-'}
              </dd>
              <dt className="text-level-4">Status</dt>
              <dd className="text-level-5">Not yet found</dd>
              <dt className="text-level-4">Time since last block</dt>
              <dd className="text-level-5 tabular-nums">{timeSinceLastFormatted}</dd>
              <dt className="text-level-4">Average block time</dt>
              <dd className="text-level-5 tabular-nums">
                {data?.avg_block_time_seconds !== null && data?.avg_block_time_seconds !== undefined && Number.isFinite(data.avg_block_time_seconds)
                  ? formatTimeSince(Math.floor(data.avg_block_time_seconds))
                  : '-'}
              </dd>
          </dl>
        </div>
        <div className="section-container">
          <SectionHeader>Pool distribution</SectionHeader>
          <PoolDistributionChart distribution={distribution ?? null} poolByIdentifier={poolByIdentifier} />
        </div>
      </div>

      <div className="section-container">
        <SectionHeader>Previous Blocks</SectionHeader>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="sortable-table w-full text-sm">
            <thead className="sticky top-0 bg-level-2 text-left">
              <tr>
                <SortableTh label="Height" sortKey="height" currentSortKey={blocksSort.sortKey} sortDir={blocksSort.sortDir} onSort={blocksSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Time" sortKey="time" currentSortKey={blocksSort.sortKey} sortDir={blocksSort.sortDir} onSort={blocksSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Pool" sortKey="pool" currentSortKey={blocksSort.sortKey} sortDir={blocksSort.sortDir} onSort={blocksSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Tx Count" sortKey="txCount" currentSortKey={blocksSort.sortKey} sortDir={blocksSort.sortDir} onSort={blocksSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Weight" sortKey="weight" currentSortKey={blocksSort.sortKey} sortDir={blocksSort.sortDir} onSort={blocksSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Size" sortKey="size" currentSortKey={blocksSort.sortKey} sortDir={blocksSort.sortDir} onSort={blocksSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Reward" sortKey="reward" currentSortKey={blocksSort.sortKey} sortDir={blocksSort.sortDir} onSort={blocksSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Fees" sortKey="fees" currentSortKey={blocksSort.sortKey} sortDir={blocksSort.sortDir} onSort={blocksSort.setSort} className="px-2 py-3 text-level-4" />
                <SortableTh label="Fees (USD)" sortKey="feesUsd" currentSortKey={blocksSort.sortKey} sortDir={blocksSort.sortDir} onSort={blocksSort.setSort} className="px-2 py-3 text-level-4" />
              </tr>
            </thead>
            <tbody>
              {blocksSort.sortedData.map((block) => (
                <tr
                  key={block.block_height}
                  className="table-row-hover cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (block.block_hash) {
                      window.open(`https://mempool.space/block/${block.block_hash}`, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && block.block_hash) {
                      e.preventDefault();
                      window.open(`https://mempool.space/block/${block.block_hash}`, '_blank', 'noopener,noreferrer');
                    }
                  }}
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
    </LoadingErrorGate>
  );
}
