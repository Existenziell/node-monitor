import { useCallback } from 'react';
import { useApi } from '@/contexts/ApiContext';
import type { BlocksData, NodeData, NetworkData, Peer, BtcPrices } from '@/types';
import { useRefreshState, useRefreshDoneMulti } from '@/contexts/RefreshContext';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { NetworkHistoryChart } from '@/components/NetworkHistoryChart';
import { PeersTable } from '@/components/PeersTable';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { LoadingErrorGate } from '@/components/LoadingErrorGate';
import { SectionHeader } from '@/components/SectionHeader';
import { BITCOIN_HALVING_INTERVAL, BITCOIN_RETARGET_INTERVAL } from '@/constants';
import { formatDifficulty, getErrorMessage } from '@/utils';

function SummaryCard({
  title,
  value,
  subLines,
}: {
  title: string;
  value: string;
  subLines?: { label: string; value: string; progress?: number }[];
}) {
  return (
    <div className="section-container">
      <SectionHeader>{title}</SectionHeader>
      <p className="text-2xl font-semibold text-level-5 mb-2">{value}</p>
      {subLines?.length ? (
        <div className="space-y-1.5 text-sm">
          {subLines.map(({ label, value: v, progress }) => (
            <div key={label}>
              <div className="flex justify-between gap-2 text-level-4">
                <span>{label}</span>
                <span className="text-level-5">{v}</span>
              </div>
              {progress !== undefined && (
                <div className="mt-0.5 h-1 rounded-full bg-level-3 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatPrice(usd: number | undefined): string {
  if (usd === undefined || usd === null || !Number.isFinite(usd)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(usd);
}

function formatSeconds(sec: number | undefined | null): string {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return '—';
  if (sec < 60) return `${Math.round(sec)} s`;
  if (sec < 3600) return `${(sec / 60).toFixed(1)} min`;
  return `${(sec / 3600).toFixed(1)} h`;
}

export function NetworkTab() {
  const { fetchNode, fetchNetwork, fetchPrice, fetchBlocks } = useApi();
  const nodeState = useApiData<NodeData>(fetchNode);
  const networkState = useApiData<NetworkData>(fetchNetwork);
  const priceState = useApiData<BtcPrices>(fetchPrice);
  const blocksState = useApiData<BlocksData>(fetchBlocks);

  const loadBoth = useCallback(
    () =>
      Promise.all([
        nodeState.load(),
        networkState.load(),
        priceState.load(),
        blocksState.load(),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load refs are stable
    [nodeState.load, networkState.load, priceState.load, blocksState.load]
  );
  const hasNetworkData =
    nodeState.data !== null &&
    nodeState.data !== undefined &&
    networkState.data !== null &&
    networkState.data !== undefined &&
    priceState.data !== null &&
    priceState.data !== undefined &&
    blocksState.data !== null &&
    blocksState.data !== undefined;
  useTabData(loadBoth, 'network', hasNetworkData);

  const { data, loading, error } = nodeState;
  const { data: networkData, loading: networkLoading, error: networkError } = networkState;
  const { data: priceData } = priceState;
  const blocksData = blocksState.data;

  useRefreshDoneMulti([loading, networkLoading, blocksState.loading], 'network');

  const blockchain = (data?.blockchain ?? {}) as Record<string, unknown>;
  const blocks = typeof blockchain.blocks === 'number' ? blockchain.blocks : null;
  const difficulty = typeof blockchain.difficulty === 'number' ? blockchain.difficulty : null;
  const peers: Peer[] = data?.peers ?? [];
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
        ? formatSeconds(blocksData.avg_block_time_seconds)
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
        ? formatSeconds(nextAdjustmentSeconds)
        : '—',
  });

  const btcPriceUsd = priceData?.USD;
  const btcPriceEur =
    priceData?.EUR !== undefined && priceData?.EUR !== null && Number.isFinite(priceData.EUR)
      ? `EUR ${Number(priceData.EUR).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : null;
  const btcPriceSubLines = btcPriceEur ? [{ label: btcPriceEur, value: '' }] : undefined;

  const { refreshTabId } = useRefreshState();
  const isRefreshing =
    (loading || networkLoading || blocksState.loading) && !!data && refreshTabId === 'network';

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
        <div className="section-container">
          <SectionHeader>Fee estimates</SectionHeader>
          <dl className="space-y-1 text-sm">
            <div>
              <div className="flex justify-between gap-4">
                <dt className="text-level-4">High priority</dt>
                <dd className="text-level-5">
                  {feeEstimates?.high_sat_per_vb !== undefined && feeEstimates?.high_sat_per_vb !== null
                    ? `${feeEstimates.high_sat_per_vb} sat/vB`
                    : '—'}
                </dd>
              </div>
              {feeEstimateErrors?.high_sat_per_vb && (
                <p className="text-sm text-semantic-warning mt-0.5" role="status">
                  {feeEstimateErrors.high_sat_per_vb}
                </p>
              )}
            </div>
            <div>
              <div className="flex justify-between gap-4">
                <dt className="text-level-4">Medium</dt>
                <dd className="text-level-5">
                  {feeEstimates?.medium_sat_per_vb !== undefined && feeEstimates?.medium_sat_per_vb !== null
                    ? `${feeEstimates.medium_sat_per_vb} sat/vB`
                    : '—'}
                </dd>
              </div>
              {feeEstimateErrors?.medium_sat_per_vb && (
                <p className="text-sm text-semantic-warning mt-0.5" role="status">
                  {feeEstimateErrors.medium_sat_per_vb}
                </p>
              )}
            </div>
            <div>
              <div className="flex justify-between gap-4">
                <dt className="text-level-4">Low priority</dt>
                <dd className="text-level-5">
                  {feeEstimates?.low_sat_per_vb !== undefined && feeEstimates?.low_sat_per_vb !== null
                    ? `${feeEstimates.low_sat_per_vb} sat/vB`
                    : '—'}
                </dd>
              </div>
              {feeEstimateErrors?.low_sat_per_vb && (
                <p className="text-sm text-semantic-warning mt-0.5" role="status">
                  {feeEstimateErrors.low_sat_per_vb}
                </p>
              )}
            </div>
          </dl>
        </div>
      </div>
      <PeersTable peers={peers} />
      <div className="section-container">
        <SectionHeader>Network history</SectionHeader>
        {networkLoading && !networkData ? (
          <div className="min-h-[240px]" aria-hidden />
        ) : networkError && !networkData ? (
          <p className="text-sm text-semantic-error">
            Error loading network data: {getErrorMessage(networkError)}. Ensure the block monitor is running and network data is being recorded.
          </p>
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
