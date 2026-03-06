import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '@/contexts/ApiContext';
import type { BlockRow, MiningInfo } from '@/types';
import { formatBytes, formatDifficulty, formatTimeSince, formatWeight } from '@/utils';
import { useRefreshState, useRefreshDone } from '@/contexts/RefreshContext';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { useTableSort } from '@/hooks/useTableSort';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { LoadingErrorGate } from '@/components/LoadingErrorGate';
import { Spinner } from '@/components/Spinner';
import { SectionHeader } from '@/components/SectionHeader';
import { SortableTh } from '@/components/SortableTh';
import { PoolCell } from '@/components/blocks/PoolCell';
import { PoolDistributionChart } from '@/components/blocks/PoolDistributionChart';
import { parseBlockTimeUtc } from '@/utils';
import { POOL_ICON_SIZE } from '@/constants';

const BLOCKS_PAGE_SIZE = 20;

type BlocksMetadata = {
  chain_height: number | null;
  seconds_since_last_block: number | null;
  avg_block_time_seconds: number | null;
  mining: MiningInfo | null;
};

export function BlocksTab() {
  const { fetchBlocksPage, fetchPools, fetchDistribution } = useApi();
  const { data: pools, loading: poolsLoading, load: loadPools } = useApiData(fetchPools);
  const { data: distribution, loading: distributionLoading, load: loadDistribution } = useApiData(fetchDistribution);
  const { refreshTabId } = useRefreshState();

  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [metadata, setMetadata] = useState<BlocksMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLTableRowElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBlocksPage({ limit: BLOCKS_PAGE_SIZE, offset: 0 });
      setBlocks(data.blocks ?? []);
      setTotalBlocks(data.total_blocks ?? data.blocks?.length ?? 0);
      setMetadata({
        chain_height: data.chain_height ?? null,
        seconds_since_last_block: data.seconds_since_last_block ?? null,
        avg_block_time_seconds: data.avg_block_time_seconds ?? null,
        mining: data.mining ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [fetchBlocksPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || blocks.length >= totalBlocks) return;
    setLoadingMore(true);
    try {
      const data = await fetchBlocksPage({ limit: BLOCKS_PAGE_SIZE, offset: blocks.length });
      setBlocks((prev) => [...prev, ...(data.blocks ?? [])]);
      setTotalBlocks(data.total_blocks ?? totalBlocks);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchBlocksPage, blocks.length, totalBlocks, loadingMore]);

  useTabData(load, 'blocks', initialLoadDone);
  useRefreshDone(loading, 'blocks');

  useEffect(() => {
    loadPools().catch(() => { });
  }, [loadPools]);

  useEffect(() => {
    loadDistribution().catch(() => { });
  }, [loadDistribution]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && blocks.length < totalBlocks && !loadingMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, blocks.length, totalBlocks, loadingMore, loading]);

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

  const blockTimeStr = blocks[0]?.block_time ?? null;
  const blockTimestamp = blockTimeStr ? parseBlockTimeUtc(blockTimeStr) : null;
  const apiSecondsSince = metadata?.seconds_since_last_block;
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

  const chainHeight = metadata?.chain_height ?? null;
  const nextBlockHeight = chainHeight !== null && chainHeight !== undefined ? chainHeight + 1 : null;
  const avgBlockTimeSeconds = metadata?.avg_block_time_seconds;

  const gateData = loading && blocks.length === 0 ? undefined : blocks;

  return (
    <LoadingErrorGate loading={loading} error={error} data={gateData} loadingLabel="blocks">
      <div className="relative space-y-4">
        <LoadingOverlay show={loading && (blocks.length > 0 || metadata !== null) && refreshTabId === 'blocks'} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="section-container">
            <SectionHeader>Next Block</SectionHeader>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-level-4">Block height</dt>
              <dd className="text-level-5 font-medium tabular-nums">
                {nextBlockHeight !== null ? `${nextBlockHeight.toLocaleString()}` : '-'}
              </dd>
              <dt className="text-level-4">Time since last block</dt>
              <dd className="text-level-5 tabular-nums">{timeSinceLastFormatted}</dd>
              <dt className="text-level-4">Average block time</dt>
              <dd className="text-level-5 tabular-nums">
                {avgBlockTimeSeconds !== null && avgBlockTimeSeconds !== undefined && Number.isFinite(avgBlockTimeSeconds)
                  ? formatTimeSince(Math.floor(avgBlockTimeSeconds))
                  : '-'}
              </dd>
              {metadata?.mining !== null && metadata?.mining !== undefined && (
                <>
                  <dt className="text-level-4">Difficulty</dt>
                  <dd className="text-level-5 tabular-nums">
                    {metadata.mining.difficulty !== null && metadata.mining.difficulty !== undefined && Number.isFinite(metadata.mining.difficulty)
                      ? formatDifficulty(metadata.mining.difficulty)
                      : '-'}
                  </dd>
                  <dt className="text-level-4">Mempool (txs)</dt>
                  <dd className="text-level-5 tabular-nums">
                    {metadata.mining.pooledtx !== null && metadata.mining.pooledtx !== undefined && Number.isFinite(metadata.mining.pooledtx)
                      ? metadata.mining.pooledtx.toLocaleString()
                      : '-'}
                  </dd>
                  <dt className="text-level-4">Current block weight</dt>
                  <dd className="text-level-5 tabular-nums">
                    {metadata.mining.currentblockweight !== null && metadata.mining.currentblockweight !== undefined && Number.isFinite(metadata.mining.currentblockweight)
                      ? formatWeight(metadata.mining.currentblockweight)
                      : '-'}
                  </dd>
                  <dt className="text-level-4">Current block tx</dt>
                  <dd className="text-level-5 tabular-nums">
                    {metadata.mining.currentblocktx !== null && metadata.mining.currentblocktx !== undefined && Number.isFinite(metadata.mining.currentblocktx)
                      ? metadata.mining.currentblocktx.toLocaleString()
                      : '-'}
                  </dd>
                  <dt className="text-level-4">Chain</dt>
                  <dd className="text-level-5 tabular-nums">
                    {metadata.mining.chain !== null && metadata.mining.chain !== undefined && String(metadata.mining.chain).trim() !== ''
                      ? String(metadata.mining.chain)
                      : '-'}
                  </dd>
                </>
              )}
            </dl>
          </div>
          <div className="section-container">
            <SectionHeader>Pool Distribution</SectionHeader>
            {distributionLoading && distribution === null ? (
              <div className="flex items-center justify-center gap-2 h-[240px] text-level-4 text-sm" role="status" aria-live="polite">
                <Spinner size="sm" aria-hidden={false} className="flex-shrink-0" />
                <span>Loading distribution…</span>
              </div>
            ) : (
              <PoolDistributionChart distribution={distribution ?? null} poolByIdentifier={poolByIdentifier} />
            )}
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
                  <SortableTh label="Duration" sortKey="duration" currentSortKey={blocksSort.sortKey} sortDir={blocksSort.sortDir} onSort={blocksSort.setSort} className="px-2 py-3 text-level-4" />
                  <SortableTh
                    label={poolsLoading ? 'Pool (loading…)' : 'Pool'}
                    sortKey="pool"
                    currentSortKey={blocksSort.sortKey}
                    sortDir={blocksSort.sortDir}
                    onSort={blocksSort.setSort}
                    className="px-2 py-3 text-level-4"
                  />
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
                    <td className="p-2 text-level-5 tabular-nums">{(block.time_since_last_block ?? '').trim() || '-'}</td>
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
                {blocks.length < totalBlocks && (
                  <tr ref={loadMoreSentinelRef}>
                    <td colSpan={10} className="p-2 text-center text-level-4 text-sm">
                      {loadingMore ? 'Loading more…' : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LoadingErrorGate>
  );
}
