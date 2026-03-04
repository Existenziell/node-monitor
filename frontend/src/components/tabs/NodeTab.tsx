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
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatBtcPerKvB(n: number | undefined | null): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return `${Number(n).toFixed(8)} BTC/kvB`;
}

function formatBtc(n: number | undefined | null): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return `${Number(n).toFixed(8)} BTC`;
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

/** Extract UA comment from subversion string, e.g. "/Satoshi:22.0.0(my comment)/" -> "my comment". */
function parseUaComment(subversion: string | undefined | null): string {
  if (subversion === null || subversion === undefined || subversion === '') return '–';
  const match = String(subversion).match(/\(([^)]*)\)/);
  return match ? match[1].trim() : '–';
}

/** Subversion string with UA comment stripped, e.g. "/Satoshi:22.0.0(my comment)/" -> "/Satoshi:22.0.0/". */
function subversionWithoutUaComment(subversion: string | undefined | null): string {
  if (subversion === null || subversion === undefined || subversion === '') return 'N/A';
  return String(subversion).replace(/\s*\([^)]*\)\s*/, '').trim() || 'N/A';
}

/** Format difficulty with T (trillion), G (billion), M (million) suffix. */
function formatDifficulty(n: number | undefined | null): string {
  if (n === null || n === undefined || !Number.isFinite(n) || n <= 0) return 'N/A';
  const num = Number(n);
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)} T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)} G`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)} M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)} K`;
  return num.toLocaleString();
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
  const hostMemory = (data?.host_memory ?? {}) as Record<string, unknown>;
  const hostArchitecture = data?.host_architecture;
  const indexing = data?.indexing ?? {};
  const hashrate = data?.hashrate as number | undefined;
  const peers: Peer[] = data?.peers ?? [];

  const hasOnionPeers = peers.some((p) => p.network === 'onion');
  const allPeersOnion = peers.length > 0 && peers.every((p) => p.network === 'onion');
  const torLabel =
    peers.length === 0 ? 'N/A' : hasOnionPeers ? (allPeersOnion ? 'Yes (Tor only)' : 'Yes') : 'No';

  const networkCardItems = [
    { label: 'Version', value: network.version },
    {
      label: 'Subversion',
      value: subversionWithoutUaComment(network.subversion as string | undefined),
    },
    {
      label: 'UA comment',
      value:
        network.uacomment !== null && network.uacomment !== undefined && String(network.uacomment).trim() !== ''
          ? String(network.uacomment)
          : (network as Record<string, unknown>).ua_comment !== null && (network as Record<string, unknown>).ua_comment !== undefined && String((network as Record<string, unknown>).ua_comment).trim() !== ''
            ? String((network as Record<string, unknown>).ua_comment)
            : parseUaComment(network.subversion as string | undefined),
    },
    { label: 'Tor', value: torLabel },
    { label: 'Protocol version', value: network.protocolversion },
    { label: 'Network active', value: network.networkactive === true ? 'Yes' : network.networkactive === false ? 'No' : 'N/A' },
    { label: 'Local relay', value: network.localrelay === true ? 'Yes' : network.localrelay === false ? 'No' : 'N/A' },
    { label: 'Time offset (s)', value: network.timeoffset },
    { label: 'Relay fee', value: network.relayfee !== null && network.relayfee !== undefined ? formatBtcPerKvB(Number(network.relayfee)) : 'N/A' },
    { label: 'Incremental fee', value: network.incrementalfee !== null && network.incrementalfee !== undefined ? formatBtcPerKvB(Number(network.incrementalfee)) : 'N/A' },
    { label: 'Warnings', value: network.warnings !== null && network.warnings !== undefined && String(network.warnings).trim() !== '' ? String(network.warnings) : 'None' },
  ];

  const bestBlockHash = typeof blockchain.bestblockhash === 'string' ? blockchain.bestblockhash : '';
  const blockchainCardItems = [
    {
      label: 'Current block',
      value:
        typeof blockchain.blocks === 'number'
          ? blockchain.blocks.toLocaleString()
          : 'N/A',
    },
    {
      label: 'Headers',
      value: typeof blockchain.headers === 'number' ? blockchain.headers.toLocaleString() : 'N/A',
    },
    { label: 'Chain', value: blockchain.chain },
    {
      label: 'Best block hash',
      value: bestBlockHash ? `${bestBlockHash.slice(0, 16)}…${bestBlockHash.slice(-8)}` : 'N/A',
    },
    {
      label: 'Verification progress',
      value:
        blockchain.verificationprogress !== null && blockchain.verificationprogress !== undefined
          ? `${(Number(blockchain.verificationprogress) * 100).toFixed(2)}%`
          : 'N/A',
    },
    {
      label: 'Initial block download',
      value: blockchain.initialblockdownload === true ? 'Yes' : blockchain.initialblockdownload === false ? 'No' : 'N/A',
    },
    {
      label: 'Size on disk',
      value: blockchain.size_on_disk !== null && blockchain.size_on_disk !== undefined ? formatBytes(Number(blockchain.size_on_disk)) : 'N/A',
    },
    {
      label: 'Pruned',
      value: blockchain.pruned === true ? 'Yes' : blockchain.pruned === false ? 'No' : 'N/A',
    },
    ...(blockchain.pruned === true && blockchain.pruneheight !== null && blockchain.pruneheight !== undefined
      ? [{ label: 'Prune height', value: Number(blockchain.pruneheight).toLocaleString() }]
      : []),
    {
      label: 'Hash rate',
      value: hashrate ? `${(hashrate / 1e18).toFixed(2)} EH/s` : 'N/A',
    },
    {
      label: 'Difficulty',
      value: formatDifficulty(blockchain.difficulty as number | undefined | null),
    },
    {
      label: 'Warnings',
      value: blockchain.warnings !== null && blockchain.warnings !== undefined && String(blockchain.warnings).trim() !== '' ? String(blockchain.warnings) : 'None',
    },
  ];

  const memLocked = memory.locked as Record<string, unknown> | undefined;
  const heapUsed = memory.used !== null && memory.used !== undefined ? Number(memory.used) : null;
  const heapFree = memory.free !== null && memory.free !== undefined ? Number(memory.free) : null;
  const heapTotal = heapUsed !== null && heapFree !== null ? heapUsed + heapFree : (memory.total !== null && memory.total !== undefined ? Number(memory.total) : null);

  const hostMemoryItems: { label: string; value: unknown }[] = [];
  if (hostArchitecture !== null && hostArchitecture !== undefined && hostArchitecture !== '') {
    hostMemoryItems.push({ label: 'Architecture', value: hostArchitecture });
  }
  if (hostMemory && typeof hostMemory.total === 'number') {
    hostMemoryItems.push(
      { label: 'Total', value: formatBytes(hostMemory.total as number) },
      { label: 'Used', value: formatBytes(hostMemory.used as number) },
      { label: 'Available', value: formatBytes(hostMemory.available as number) },
      {
        label: 'Percent used',
        value: hostMemory.percent !== null && hostMemory.percent !== undefined ? `${Number(hostMemory.percent)}%` : 'N/A',
      }
    );
    if (typeof hostMemory.swap_total === 'number' && hostMemory.swap_total > 0) {
      hostMemoryItems.push(
        { label: 'Swap total', value: formatBytes(hostMemory.swap_total as number) },
        { label: 'Swap free', value: formatBytes(hostMemory.swap_free as number) }
      );
    }
  }

  const processMemoryItems: { label: string; value: unknown }[] = [
    ...(heapUsed !== null || heapFree !== null
      ? [
          { label: 'Heap used', value: heapUsed !== null ? formatBytes(heapUsed) : 'N/A' },
          { label: 'Heap free', value: heapFree !== null ? formatBytes(heapFree) : 'N/A' },
          ...(heapTotal !== null ? [{ label: 'Heap total', value: formatBytes(heapTotal) }] : []),
        ]
      : []),
    {
      label: 'Locked used',
      value: memLocked?.used !== null && memLocked?.used !== undefined ? formatBytes(Number(memLocked.used)) : 'N/A',
    },
    {
      label: 'Locked free',
      value: memLocked?.free !== null && memLocked?.free !== undefined ? formatBytes(Number(memLocked.free)) : 'N/A',
    },
    {
      label: 'Locked total',
      value: memLocked?.total !== null && memLocked?.total !== undefined ? formatBytes(Number(memLocked.total)) : 'N/A',
    },
    ...(memory.chunks_used !== null && memory.chunks_used !== undefined
      ? [{ label: 'Chunks used', value: Number(memory.chunks_used).toLocaleString() }]
      : []),
    ...(memory.chunks_free !== null && memory.chunks_free !== undefined
      ? [{ label: 'Chunks free', value: Number(memory.chunks_free).toLocaleString() }]
      : []),
  ];

  const memoryCardItems =
    hostMemoryItems.length > 0
      ? [
          ...hostMemoryItems,
          { label: 'Process (bitcoind)', value: '' },
          ...processMemoryItems,
        ]
      : processMemoryItems;

  const mempoolCardItems = [
    {
      label: 'Loaded',
      value: mempool.loaded === true ? 'Yes' : mempool.loaded === false ? 'No' : 'N/A',
    },
    {
      label: 'Transactions',
      value: mempool.size !== null && mempool.size !== undefined ? Number(mempool.size).toLocaleString() : 'N/A',
    },
    {
      label: 'Size (vB)',
      value: mempool.bytes !== null && mempool.bytes !== undefined ? formatBytes(Number(mempool.bytes)) : 'N/A',
    },
    {
      label: 'Memory usage',
      value: mempool.usage !== null && mempool.usage !== undefined ? formatBytes(Number(mempool.usage)) : 'N/A',
    },
    {
      label: 'Total fee',
      value: mempool.total_fee !== null && mempool.total_fee !== undefined ? formatBtc(Number(mempool.total_fee)) : 'N/A',
    },
    {
      label: 'Max mempool',
      value: mempool.maxmempool !== null && mempool.maxmempool !== undefined ? formatBytes(Number(mempool.maxmempool)) : 'N/A',
    },
    {
      label: 'Mempool min fee',
      value: mempool.mempoolminfee !== null && mempool.mempoolminfee !== undefined ? formatBtcPerKvB(Number(mempool.mempoolminfee)) : 'N/A',
    },
    {
      label: 'Min relay tx fee',
      value: mempool.minrelaytxfee !== null && mempool.minrelaytxfee !== undefined ? formatBtcPerKvB(Number(mempool.minrelaytxfee)) : 'N/A',
    },
    {
      label: 'Incremental relay fee',
      value: mempool.incrementalrelayfee !== null && mempool.incrementalrelayfee !== undefined ? formatBtcPerKvB(Number(mempool.incrementalrelayfee)) : 'N/A',
    },
    {
      label: 'Unbroadcast count',
      value: mempool.unbroadcastcount !== null && mempool.unbroadcastcount !== undefined ? Number(mempool.unbroadcastcount).toLocaleString() : 'N/A',
    },
    {
      label: 'Full RBF',
      value: mempool.fullrbf === true ? 'Yes' : mempool.fullrbf === false ? 'No' : 'N/A',
    },
  ];

  const indexingEntries: { label: string; value: unknown }[] = Object.entries(indexing).map(([name, info]) => {
    const obj = info as { synced?: boolean; best_block_height?: number } | undefined;
    const synced = obj?.synced === true;
    const height = obj?.best_block_height;
    const heightStr = height !== null && height !== undefined ? height.toLocaleString() : '–';
    return {
      label: name.toUpperCase(),
      value: `${synced ? 'Synced' : 'Syncing'} (block ${heightStr})`,
    };
  });
  if (blockchain.verificationprogress !== null && blockchain.verificationprogress !== undefined) {
    indexingEntries.push({
      label: 'Chain sync progress',
      value: `${(Number(blockchain.verificationprogress) * 100).toFixed(2)}%`,
    });
  }
  if (indexingEntries.length === 0) {
    indexingEntries.push({ label: 'No indexes', value: 'N/A' });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard title="Network Status" items={networkCardItems} />
        <InfoCard title="Blockchain Status" items={blockchainCardItems} />
        <InfoCard title="Mempool Status" items={mempoolCardItems} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="Indexing Status" items={indexingEntries} />
        <InfoCard title="Host System" items={memoryCardItems} />
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
            Error loading network data: {networkError.message}. Ensure the block monitor is running and network data is being recorded.
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
