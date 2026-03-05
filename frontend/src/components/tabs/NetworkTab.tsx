import { useCallback, useEffect } from 'react';
import { useApi } from '@/contexts/ApiContext';
import type { NodeData, NetworkData, Peer, BtcPrices } from '@/types';
import { getRefreshTabId, clearRefreshTabId } from '@/refreshState';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { NetworkHistoryChart } from '@/components/NetworkHistoryChart';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { formatDifficulty } from '@/utils';

const HALVING_INTERVAL = 210_000;
const RETARGET_INTERVAL = 2016;

function formatBytes(n: number | undefined | null): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatPeerTime(epoch: number | undefined | null): string {
  if (epoch === null || epoch === undefined || !Number.isFinite(epoch) || epoch <= 0) return '-';
  try {
    const date = new Date(epoch * 1000);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffM = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffM / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffM < 1) return 'just now';
    if (diffM < 60) return `${diffM}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7) return `${diffD}d ago`;
    return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '-';
  }
}

function formatSubver(subver: string | undefined | null): string {
  if (subver === null || subver === undefined || subver === '') return '-';
  const s = String(subver).replace(/^\/+|\/+$/g, '').trim();
  return s || '-';
}

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

export function NetworkTab() {
  const { fetchNode, fetchNetwork, fetchPrice } = useApi();
  const nodeState = useApiData<NodeData>(fetchNode);
  const networkState = useApiData<NetworkData>(fetchNetwork);
  const priceState = useApiData<BtcPrices>(fetchPrice);

  const loadBoth = useCallback(
    () =>
      Promise.all([
        nodeState.load(),
        networkState.load(),
        priceState.load(),
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load refs are stable
    [nodeState.load, networkState.load, priceState.load]
  );
  useTabData(loadBoth, 'network');

  const { data, loading, error } = nodeState;
  const { data: networkData, loading: networkLoading, error: networkError } = networkState;
  const { data: priceData } = priceState;

  useEffect(() => {
    if (!loading && !networkLoading) {
      clearRefreshTabId('network');
    }
  }, [loading, networkLoading]);

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
    value: '—',
  });

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
    (loading || networkLoading) && !!data && getRefreshTabId() === 'network';

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
            <div className="flex justify-between gap-4">
              <dt className="text-level-4">High priority</dt>
              <dd className="text-level-5">
                {feeEstimates?.high_sat_per_vb !== undefined && feeEstimates?.high_sat_per_vb !== null
                  ? `${feeEstimates.high_sat_per_vb} sat/vB`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-level-4">Medium</dt>
              <dd className="text-level-5">
                {feeEstimates?.medium_sat_per_vb !== undefined && feeEstimates?.medium_sat_per_vb !== null
                  ? `${feeEstimates.medium_sat_per_vb} sat/vB`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-level-4">Low priority</dt>
              <dd className="text-level-5">
                {feeEstimates?.low_sat_per_vb !== undefined && feeEstimates?.low_sat_per_vb !== null
                  ? `${feeEstimates.low_sat_per_vb} sat/vB`
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      {peers.length > 0 && (
        <div className="rounded-lg bg-level-2 border border-level-3 overflow-hidden">
          <h3 className="text-sm font-medium text-accent p-4 pb-2">
            Peers ({peers.length})
          </h3>
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-level-2 text-left">
                <tr>
                  <th className="px-2 py-3 text-level-4">Address</th>
                  <th className="px-2 py-3 text-level-4">Network</th>
                  <th className="px-2 py-3 text-level-4">Direction</th>
                  <th className="px-2 py-3 text-level-4">Version</th>
                  <th className="px-2 py-3 text-level-4">Connection type</th>
                  <th className="px-2 py-3 text-level-4">Connected</th>
                  <th className="px-2 py-3 text-level-4">Last recv</th>
                  <th className="px-2 py-3 text-level-4">Sent</th>
                  <th className="px-2 py-3 text-level-4">Recv</th>
                  <th className="px-2 py-3 text-level-4">Ping</th>
                  <th className="px-2 py-3 text-level-4">Starting height</th>
                  <th className="px-2 py-3 text-level-4">Transport</th>
                </tr>
              </thead>
              <tbody>
                {peers.map((peer, index) => (
                  <tr
                    key={String(peer.id ?? peer.addr ?? index)}
                    className="border-t border-level-3 hover:bg-level-3"
                  >
                    <td className="p-2 text-level-5 font-mono truncate max-w-[180px]" title={peer.addr ?? ''}>
                      {peer.addr ?? '-'}
                    </td>
                    <td className="p-2 text-level-5">{peer.network ?? '-'}</td>
                    <td className="p-2 text-level-5">{peer.inbound === true ? 'In' : peer.inbound === false ? 'Out' : '-'}</td>
                    <td className="p-2 text-level-5 truncate max-w-[140px]" title={peer.subver ?? ''}>
                      {formatSubver(peer.subver)}
                    </td>
                    <td className="p-2 text-level-5">{peer.connection_type ?? '-'}</td>
                    <td className="p-2 text-level-5">{formatPeerTime(peer.conntime)}</td>
                    <td className="p-2 text-level-5">{formatPeerTime(peer.lastrecv)}</td>
                    <td className="p-2 text-level-5">{formatBytes(peer.bytessent)}</td>
                    <td className="p-2 text-level-5">{formatBytes(peer.bytesrecv)}</td>
                    <td className="p-2 text-level-5">
                      {peer.pingtime !== null && peer.pingtime !== undefined && Number.isFinite(peer.pingtime) ? `${Number(peer.pingtime).toFixed(0)} ms` : '-'}
                    </td>
                    <td className="p-2 text-level-5">
                      {peer.startingheight !== null && peer.startingheight !== undefined && Number.isFinite(peer.startingheight) ? Number(peer.startingheight).toLocaleString() : '-'}
                    </td>
                    <td className="p-2 text-level-5">{peer.transport_protocol_type ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
