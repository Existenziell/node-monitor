import { useCallback, useEffect } from 'react';
import { useApi } from '@/contexts/ApiContext';
import type { BlocksData, NodeData, NetworkData, Peer, BtcPrices } from '@/types';
import { getRefreshTabId, clearRefreshTabId } from '@/refreshState';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { NetworkHistoryChart } from '@/components/NetworkHistoryChart';
import { PeersTable } from '@/components/PeersTable';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { formatDifficulty } from '@/utils';

const HALVING_INTERVAL = 210_000;
const RETARGET_INTERVAL = 2016;

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
    <div className="rounded-lg bg-level-2 border border-level-3 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-level-4 mb-1">
        {title}
      </h3>
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
  useTabData(loadBoth, 'network');

  const { data, loading, error } = nodeState;
  const { data: networkData, loading: networkLoading, error: networkError } = networkState;
  const { data: priceData } = priceState;
  const blocksData = blocksState.data;

  useEffect(() => {
    if (!loading && !networkLoading && !blocksState.loading) {
      clearRefreshTabId('network');
    }
  }, [loading, networkLoading, blocksState.loading]);

  if (loading && !data) {
    return (
      <div className="p-4 text-level-4 flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-level-3 border-t-accent" aria-hidden />
        Loading network…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 text-red-400">
        Error loading node data: {error.message}. Make sure the API server is running.
      </div>
    );
  }

  const blockchain = (data?.blockchain ?? {}) as Record<string, unknown>;
  const blocks = typeof blockchain.blocks === 'number' ? blockchain.blocks : null;
  const difficulty = typeof blockchain.difficulty === 'number' ? blockchain.difficulty : null;
  const peers: Peer[] = data?.peers ?? [];
  const feeEstimates = networkData?.fee_estimates;
  const feeEstimateErrors = networkData?.fee_estimate_errors;

  const halvingProgress = blocks !== null ? (blocks % HALVING_INTERVAL) / HALVING_INTERVAL : null;
  const halvingLeft = blocks !== null ? HALVING_INTERVAL - (blocks % HALVING_INTERVAL) : null;
  const retargetProgress = blocks !== null ? (blocks % RETARGET_INTERVAL) / RETARGET_INTERVAL : null;
  const retargetLeft = blocks !== null ? RETARGET_INTERVAL - (blocks % RETARGET_INTERVAL) : null;

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
  if (blocksData?.seconds_since_last_block !== null && blocksData?.seconds_since_last_block !== undefined && Number.isFinite(blocksData.seconds_since_last_block)) {
    blockHeightSubLines.push({
      label: 'Time since last block',
      value: formatSeconds(blocksData.seconds_since_last_block),
    });
  }

  const difficultySubLines: { label: string; value: string; progress?: number }[] = [];
  if (retargetProgress !== null && retargetLeft !== null) {
    difficultySubLines.push({
      label: 'Retarget',
      value: `${(retargetProgress * 100).toFixed(1)}% (${retargetLeft} left)`,
      progress: retargetProgress * 100,
    });
  }
  difficultySubLines.push({ label: 'Next adjustment', value: '—' });

  const btcPriceUsd = priceData?.USD;
  const btcPriceEur =
    priceData?.EUR !== undefined && priceData?.EUR !== null && Number.isFinite(priceData.EUR)
      ? `EUR ${Number(priceData.EUR).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : null;
  const btcPriceSubLines = btcPriceEur ? [{ label: btcPriceEur, value: '' }] : undefined;

  const isRefreshing =
    (loading || networkLoading || blocksState.loading) && !!data && getRefreshTabId() === 'network';

  return (
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
        <div className="rounded-lg bg-level-2 border border-level-3 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-level-4 mb-2">
            Fee estimates
          </h3>
          <dl className="space-y-1 text-sm">
            {data?.connection_count !== null && data?.connection_count !== undefined && Number.isFinite(data.connection_count) && (
              <div className="flex justify-between gap-4">
                <dt className="text-level-4">Connections</dt>
                <dd className="text-level-5">{Number(data.connection_count).toLocaleString()}</dd>
              </div>
            )}
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
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5" role="status">
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
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5" role="status">
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
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5" role="status">
                  {feeEstimateErrors.low_sat_per_vb}
                </p>
              )}
            </div>
          </dl>
        </div>
      </div>
      <PeersTable peers={peers} />
      <div className="rounded-lg bg-level-2 border border-level-3 p-4">
        <h3 className="text-sm font-medium text-accent mb-2">Network history</h3>
        {networkLoading && !networkData ? (
          <div className="min-h-[240px]" aria-hidden />
        ) : networkError && !networkData ? (
          <p className="text-sm text-red-400">
            Error loading network data: {networkError.message}. Ensure the block monitor is running and network data is being recorded.
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
  );
}
