import { useCallback } from 'react';
import { useApi } from '@/contexts/ApiContext';
import type { BlocksData, NodeData, NetworkData, BtcPrices, Peer } from '@/types';
import { useRefreshState, useRefreshDoneMulti } from '@/contexts/RefreshContext';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { NetworkHistoryChart } from '@/components/network/NetworkHistoryChart';
import { PeersTable } from '@/components/network/PeersTable';
import { SummaryCard } from '@/components/network/SummaryCard';
import { formatPrice } from '@/utils';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { LoadingErrorGate } from '@/components/LoadingErrorGate';
import { Spinner } from '@/components/Spinner';
import { SectionHeader } from '@/components/SectionHeader';
import { BITCOIN_HALVING_INTERVAL, BITCOIN_RETARGET_INTERVAL } from '@/constants';
import { formatDifficulty, formatTimeSince } from '@/utils';

export function NetworkTab() {
  const { fetchNode, fetchNetwork, fetchPrice, fetchBlocks } = useApi();
  const nodeState = useApiData<NodeData>(fetchNode);
  const networkState = useApiData<NetworkData>(fetchNetwork);
  const priceState = useApiData<BtcPrices>(fetchPrice);
  const blocksState = useApiData<BlocksData>(fetchBlocks);

  const loadAll = useCallback(
    () =>
      Promise.all([
        nodeState.load(),
        networkState.load(),
        priceState.load(),
        blocksState.load(),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend only on stable load refs
    [nodeState.load, networkState.load, priceState.load, blocksState.load]
  );

  const hasAnyData =
    (nodeState.data !== null && nodeState.data !== undefined) ||
    (networkState.data !== null && networkState.data !== undefined) ||
    (priceState.data !== null && priceState.data !== undefined) ||
    (blocksState.data !== null && blocksState.data !== undefined);

  useTabData(loadAll, 'network', hasAnyData);
  useRefreshDoneMulti(
    [nodeState.loading, networkState.loading, priceState.loading, blocksState.loading],
    'network'
  );

  const nodeData = nodeState.data;
  const networkData = networkState.data;
  const priceData = priceState.data;
  const blocksData = blocksState.data;

  const blockchain = (nodeData?.blockchain ?? {}) as Record<string, unknown>;
  const blocks = typeof blockchain.blocks === 'number' ? blockchain.blocks : null;
  const difficulty = typeof blockchain.difficulty === 'number' ? blockchain.difficulty : null;
  const peers: Peer[] = nodeData?.peers ?? [];
  const hashrate = nodeData?.hashrate;
  const feeEstimates = networkData?.fee_estimates;
  const feeEstimateErrors = networkData?.fee_estimate_errors;

  const halvingProgress = blocks !== null ? (blocks % BITCOIN_HALVING_INTERVAL) / BITCOIN_HALVING_INTERVAL : null;
  const halvingLeft = blocks !== null ? BITCOIN_HALVING_INTERVAL - (blocks % BITCOIN_HALVING_INTERVAL) : null;
  const retargetProgress = blocks !== null ? (blocks % BITCOIN_RETARGET_INTERVAL) / BITCOIN_RETARGET_INTERVAL : null;
  const retargetLeft = blocks !== null ? BITCOIN_RETARGET_INTERVAL - (blocks % BITCOIN_RETARGET_INTERVAL) : null;

  const blockHeightSubLines: { label: string; value: string; progress?: number }[] = [];
  if (halvingProgress !== null && halvingLeft !== null) {
    blockHeightSubLines.push({
      label: 'Halving epoch',
      value: `${(halvingProgress * 100).toFixed(1)}% (${halvingLeft.toLocaleString()} left)`,
      progress: halvingProgress * 100,
    });
  }
  blockHeightSubLines.push({
    label: 'Avg block time',
    value:
      blocksData?.avg_block_time_seconds !== null && blocksData?.avg_block_time_seconds !== undefined && Number.isFinite(blocksData.avg_block_time_seconds)
        ? formatTimeSince(blocksData.avg_block_time_seconds)
        : '—',
  });
  const difficultySubLines: { label: string; value: string; progress?: number }[] = [];
  if (retargetProgress !== null && retargetLeft !== null) {
    difficultySubLines.push({
      label: 'Retarget',
      value: `${(retargetProgress * 100).toFixed(1)}% (${retargetLeft} left)`,
      progress: retargetProgress * 100,
    });
  }
  const avgBlockTimeSeconds = blocksData?.avg_block_time_seconds;
  const nextAdjustmentSeconds =
    retargetLeft !== null &&
      avgBlockTimeSeconds !== null &&
      avgBlockTimeSeconds !== undefined &&
      Number.isFinite(avgBlockTimeSeconds)
      ? retargetLeft * avgBlockTimeSeconds
      : null;
  difficultySubLines.push({
    label: 'Next adjustment',
    value:
      nextAdjustmentSeconds !== null && Number.isFinite(nextAdjustmentSeconds)
        ? formatTimeSince(nextAdjustmentSeconds)
        : '—',
  });

  const btcPriceUsd = priceData?.USD;
  const btcPriceEur =
    priceData?.EUR !== undefined && priceData?.EUR !== null && Number.isFinite(priceData.EUR)
      ? `EUR ${Number(priceData.EUR).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : null;
  const btcPriceSubLines =
    btcPriceEur !== null && btcPriceEur !== undefined ? [{ label: 'Price in EUR', value: btcPriceEur }] : undefined;

  const feeLabels = ['High priority', 'Medium', 'Low priority'] as const;
  const feeKeys = ['high_sat_per_vb', 'medium_sat_per_vb', 'low_sat_per_vb'] as const;
  const hashrateSubLines: { label: string; value: string }[] = [];
  feeLabels.forEach((label, i) => {
    const key = feeKeys[i];
    const sat = feeEstimates?.[key];
    const err = feeEstimateErrors?.[key];
    const value =
      sat !== undefined && sat !== null ? `${sat} sat/vB` : err ? `— ${err}` : '—';
    hashrateSubLines.push({ label, value });
  });
  const hashrateSubLinesFinal = hashrateSubLines.length ? hashrateSubLines : undefined;

  const { refreshTabId } = useRefreshState();
  const anyLoading =
    nodeState.loading || networkState.loading || priceState.loading || blocksState.loading;
  const isRefreshing = anyLoading && hasAnyData && refreshTabId === 'network';

  const criticalError = nodeState.error && (nodeState.data === null || nodeState.data === undefined);
  const criticalData = nodeState.data;

  return (
    <LoadingErrorGate
      loading={false}
      error={criticalError ? nodeState.error : null}
      data={criticalData}
      loadingLabel="network"
    >
      <div className="relative space-y-4">
        <LoadingOverlay show={isRefreshing} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Block height"
            value={blocks !== null ? blocks.toLocaleString() : '—'}
            subLines={blockHeightSubLines.length ? blockHeightSubLines : undefined}
            loading={nodeState.loading && (nodeData === null || nodeData === undefined)}
          />
          <SummaryCard
            title="Network difficulty"
            value={difficulty !== null ? formatDifficulty(difficulty) : '—'}
            subLines={difficultySubLines.length ? difficultySubLines : undefined}
            loading={nodeState.loading && (nodeData === null || nodeData === undefined)}
          />
          <SummaryCard
            title="BTC price"
            value={formatPrice(btcPriceUsd)}
            subLines={btcPriceSubLines}
            loading={priceState.loading && (priceData === null || priceData === undefined)}
          />
          <SummaryCard
            title="Network hashrate"
            value={
              hashrate !== null && hashrate !== undefined && Number.isFinite(hashrate)
                ? `${(hashrate / 1e18).toFixed(2)} EH/s`
                : '—'
            }
            subLines={hashrateSubLinesFinal}
            compactSubLines
            loading={nodeState.loading && (nodeData === null || nodeData === undefined)}
          />
        </div>
        <PeersTable peers={peers} />
        <div className="section-container">
          <SectionHeader>Network History</SectionHeader>
          {networkState.loading && (networkData === null || networkData === undefined) ? (
            <div className="flex items-center justify-center gap-2 min-h-[240px] text-level-4 text-sm" role="status" aria-live="polite">
              <Spinner size="sm" aria-hidden={false} className="flex-shrink-0" />
              <span>Loading network history…</span>
            </div>
          ) : (networkData?.network_history?.length ?? 0) === 0 ? (
            <p className="text-sm text-level-4">
              No network history yet. Data is recorded over time when the block monitor is running.
            </p>
          ) : (
            <NetworkHistoryChart networkHistory={networkData?.network_history ?? []} />
          )}
        </div>
      </div>
    </LoadingErrorGate>
  );
}
