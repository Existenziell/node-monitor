import { useApi } from '@/contexts/ApiContext';
import type { NetworkTabData, Peer } from '@/types';
import { useRefreshState, useRefreshDone } from '@/contexts/RefreshContext';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { NetworkHistoryChart } from '@/components/network/NetworkHistoryChart';
import { PeersTable } from '@/components/network/PeersTable';
import { SummaryCard } from '@/components/network/SummaryCard';
import { formatPrice } from '@/utils';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { LoadingErrorGate } from '@/components/LoadingErrorGate';
import { SectionHeader } from '@/components/SectionHeader';
import { BITCOIN_HALVING_INTERVAL, BITCOIN_RETARGET_INTERVAL } from '@/constants';
import { formatDifficulty, formatTimeSince } from '@/utils';

export function NetworkTab() {
  const { fetchNetworkTab } = useApi();
  const { data, loading, error, load } = useApiData<NetworkTabData>(fetchNetworkTab);

  useTabData(load, 'network', data !== null && data !== undefined);
  useRefreshDone(loading, 'network');

  const nodeData = data?.node;
  const networkData = data?.network;
  const priceData = data?.price;
  const blocksData = data?.blocks;

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
  const isRefreshing = loading && !!data && refreshTabId === 'network';

  return (
    <LoadingErrorGate loading={loading} error={error} data={data} loadingLabel="network">
      <div className="relative space-y-4">
        <LoadingOverlay show={isRefreshing} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Block height"
            value={blocks !== null ? blocks.toLocaleString() : 'N/A'}
            subLines={blockHeightSubLines.length ? blockHeightSubLines : undefined}
          />
          <SummaryCard
            title="Network difficulty"
            value={difficulty !== null ? formatDifficulty(difficulty) : 'N/A'}
            subLines={difficultySubLines.length ? difficultySubLines : undefined}
          />
          <SummaryCard
            title="BTC price"
            value={formatPrice(btcPriceUsd)}
            subLines={btcPriceSubLines}
          />
          <SummaryCard
            title="Network hashrate"
            value={
              hashrate !== null && hashrate !== undefined && Number.isFinite(hashrate)
                ? `${(hashrate / 1e18).toFixed(2)} EH/s`
                : 'N/A'
            }
            subLines={hashrateSubLinesFinal}
            compactSubLines
          />
        </div>
        <PeersTable peers={peers} />
        <div className="section-container">
          <SectionHeader>Network History</SectionHeader>
          {(networkData?.network_history?.length ?? 0) === 0 ? (
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
