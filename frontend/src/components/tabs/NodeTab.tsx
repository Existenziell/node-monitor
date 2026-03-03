import { useCallback, useEffect } from 'react';
import { useApi } from '@/contexts/ApiContext';
import type { NodeData, NetworkData, Peer } from '@/types';
import { useConsole } from '@/contexts/ConsoleContext';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { NetworkHistoryChart } from '@/components/NetworkHistoryChart';

function formatBytes(n: number | undefined | null): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
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

function InfoCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: unknown }[];
}) {
  return (
    <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 p-4">
      <h3 className="text-accent-light dark:text-gold font-medium mb-2">
        {title}
      </h3>
      <dl className="space-y-1 text-sm">
        {items.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-gray-600 dark:text-gray-400">{label}</dt>
            <dd className="truncate text-gray-900 dark:text-gray-300" title={String(value)}>
              {value !== null && value !== undefined ? String(value) : 'N/A'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function NodeTab() {
  const { fetchNode, fetchNetwork } = useApi();
  const nodeState = useApiData<NodeData>(fetchNode);
  const networkState = useApiData<NetworkData>(fetchNetwork);
  const { log } = useConsole();

  const loadBoth = useCallback(
    () => Promise.all([nodeState.load(), networkState.load()]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeState.load, networkState.load]
  );
  useTabData(loadBoth, 'node');

  const { data, loading, error } = nodeState;
  const { data: networkData, loading: networkLoading, error: networkError } = networkState;

  useEffect(() => {
    if (data?.blockchain && typeof data.blockchain.blocks === 'number') {
      log(`Node synced to block #${data.blockchain.blocks.toLocaleString()}`, 'info');
    }
  }, [data, log]);

  if (loading && !data) {
    return (
      <div className="p-4 text-gray-600 dark:text-gray-400">Loading node data...</div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 text-red-400 dark:text-red-400">
        Error loading node data: {error.message}. Make sure the API server is running.
      </div>
    );
  }

  const blockchain = (data?.blockchain ?? {}) as Record<string, unknown>;
  const network = (data?.network ?? {}) as Record<string, unknown>;
  const mempool = (data?.mempool ?? {}) as Record<string, unknown>;
  const memory = (data?.memory ?? {}) as Record<string, unknown>;
  const indexing = data?.indexing ?? {};
  const hashrate = data?.hashrate as number | undefined;
  const peers: Peer[] = data?.peers ?? [];

  const networkCardItems = [
    { label: 'Connections', value: network.connections },
    { label: 'Version', value: network.version },
    {
      label: 'Subversion',
      value: network.subversion !== null && network.subversion !== undefined && network.subversion !== '' ? String(network.subversion) : 'N/A',
    },
  ];

  const blockchainCardItems = [
    {
      label: 'Current Block',
      value:
        typeof blockchain.blocks === 'number'
          ? blockchain.blocks.toLocaleString()
          : 'N/A',
    },
    { label: 'Chain', value: blockchain.chain },
    {
      label: 'Hash Rate',
      value: hashrate ? `${(hashrate / 1e18).toFixed(2)} EH/s` : 'N/A',
    },
  ];

  const memLocked = memory.locked as Record<string, unknown> | undefined;
  const memoryCardItems = [
    {
      label: 'Used',
      value: memLocked?.used
        ? `${(Number(memLocked.used) / 1024 / 1024).toFixed(2)} MB`
        : 'N/A',
    },
    {
      label: 'Free',
      value: memLocked?.free
        ? `${(Number(memLocked.free) / 1024 / 1024).toFixed(2)} MB`
        : 'N/A',
    },
    {
      label: 'Total',
      value: memLocked?.total
        ? `${(Number(memLocked.total) / 1024 / 1024).toFixed(2)} MB`
        : 'N/A',
    },
  ];

  const mempoolCardItems = [
    {
      label: 'Transactions',
      value: mempool.size !== null && mempool.size !== undefined ? Number(mempool.size).toLocaleString() : 'N/A',
    },
    {
      label: 'Memory',
      value: mempool.bytes
        ? `${(Number(mempool.bytes) / 1024 / 1024).toFixed(2)} MB`
        : 'N/A',
    },
    {
      label: 'Min Fee',
      value: mempool.mempoolminfee
        ? `${Number(mempool.mempoolminfee).toFixed(8)} BTC/kB`
        : 'N/A',
    },
  ];

  const indexingEntries = Object.entries(indexing).map(([name, info]) => ({
    label: name.toUpperCase(),
    value: (info as { synced?: boolean })?.synced ? 'Synced' : 'Syncing',
  }));
  if (blockchain.verificationprogress !== null && blockchain.verificationprogress !== undefined) {
    indexingEntries.push({
      label: 'Sync Progress',
      value: `${(Number(blockchain.verificationprogress) * 100).toFixed(1)}%`,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard title="Network Status" items={networkCardItems} />
        <InfoCard title="Blockchain Status" items={blockchainCardItems} />
        <InfoCard title="Memory Usage" items={memoryCardItems} />
        <InfoCard title="Mempool Status" items={mempoolCardItems} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard
          title="Indexing Status"
          items={indexingEntries.length ? indexingEntries : [{ label: 'No indexes', value: '' }]}
        />
      </div>
      {peers.length > 0 && (
        <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 overflow-hidden">
          <h3 className="text-accent-light dark:text-gold font-medium p-4 pb-2">
            Peers ({peers.length})
          </h3>
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-100 dark:bg-black/80 text-left">
                <tr>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Address</th>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Network</th>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Direction</th>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Version</th>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Connection type</th>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Connected</th>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Last recv</th>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Sent</th>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Recv</th>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Ping</th>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Starting height</th>
                  <th className="p-2 text-gray-700 dark:text-gray-400">Transport</th>
                </tr>
              </thead>
              <tbody>
                {peers.map((peer, index) => (
                  <tr
                    key={String(peer.id ?? peer.addr ?? index)}
                    className="border-t border-gray-200 dark:border-gold/10 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <td className="p-2 text-gray-900 dark:text-gray-300 font-mono truncate max-w-[180px]" title={peer.addr ?? ''}>
                      {peer.addr ?? '-'}
                    </td>
                    <td className="p-2 text-gray-900 dark:text-gray-300">{peer.network ?? '-'}</td>
                    <td className="p-2 text-gray-900 dark:text-gray-300">{peer.inbound === true ? 'In' : peer.inbound === false ? 'Out' : '-'}</td>
                    <td className="p-2 text-gray-900 dark:text-gray-300 truncate max-w-[140px]" title={peer.subver ?? ''}>
                      {formatSubver(peer.subver)}
                    </td>
                    <td className="p-2 text-gray-900 dark:text-gray-300">{peer.connection_type ?? '-'}</td>
                    <td className="p-2 text-gray-900 dark:text-gray-300">{formatPeerTime(peer.conntime)}</td>
                    <td className="p-2 text-gray-900 dark:text-gray-300">{formatPeerTime(peer.lastrecv)}</td>
                    <td className="p-2 text-gray-900 dark:text-gray-300">{formatBytes(peer.bytessent)}</td>
                    <td className="p-2 text-gray-900 dark:text-gray-300">{formatBytes(peer.bytesrecv)}</td>
                    <td className="p-2 text-gray-900 dark:text-gray-300">
                      {peer.pingtime !== null && peer.pingtime !== undefined && Number.isFinite(peer.pingtime) ? `${Number(peer.pingtime).toFixed(0)} ms` : '-'}
                    </td>
                    <td className="p-2 text-gray-900 dark:text-gray-300">
                      {peer.startingheight !== null && peer.startingheight !== undefined && Number.isFinite(peer.startingheight) ? Number(peer.startingheight).toLocaleString() : '-'}
                    </td>
                    <td className="p-2 text-gray-900 dark:text-gray-300">{peer.transport_protocol_type ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-gold/20 p-4">
        <h3 className="text-accent-light dark:text-gold font-medium mb-2">Network history</h3>
        {networkLoading && !networkData ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading network data...</p>
        ) : networkError && !networkData ? (
          <p className="text-sm text-red-400 dark:text-red-400">
            Error loading network data: {networkError.message}. Ensure network data (difficulty.json) is populated.
          </p>
        ) : (networkData?.network_history?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No network history yet. Data is recorded over time when the block monitor is running.
          </p>
        ) : (
          <NetworkHistoryChart networkHistory={networkData?.network_history ?? []} />
        )}
      </div>
    </div>
  );
}
