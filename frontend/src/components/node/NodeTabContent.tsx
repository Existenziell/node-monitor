import { useRefreshState } from '@/contexts/RefreshContext';
import type { GroupedItem, NodeData, Peer } from '@/types';
import { formatBytes, formatDifficulty, formatHash } from '@/utils';
import { KNOWN_INDEXES } from '@/data/indexTypes';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { InfoCard } from '@/components/node/InfoCard';
import { GroupedInfoCard } from '@/components/node/GroupedInfoCard';
import {
  formatBtc,
  formatBtcPerKvB,
  formatUptime,
  parseUaComment,
  subversionWithoutUaComment,
} from '@/utils';

export function NodeTabContent({ data, loading }: { data: NodeData; loading: boolean }) {
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
    ...(data?.nettotals && (data.nettotals.totalbytessent !== null && data.nettotals.totalbytessent !== undefined || data.nettotals.totalbytesrecv !== null && data.nettotals.totalbytesrecv !== undefined)
      ? [
          { label: 'Total bytes sent', value: formatBytes(data.nettotals.totalbytessent) },
          { label: 'Total bytes recv', value: formatBytes(data.nettotals.totalbytesrecv) },
        ]
      : []),
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
      value: formatHash(bestBlockHash, 'N/A'),
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

  const hostSystemItems: GroupedItem[] = [];
  if (hostArchitecture !== null && hostArchitecture !== undefined && hostArchitecture !== '') {
    hostSystemItems.push({ label: 'Architecture', value: hostArchitecture });
  }
  if (hostMemory && typeof hostMemory.total === 'number') {
    hostSystemItems.push(
      { label: 'Total memory', value: formatBytes(hostMemory.total as number) },
      { label: 'Used memory', value: formatBytes(hostMemory.used as number) },
      { label: 'Available memory', value: formatBytes(hostMemory.available as number) },
      {
        label: 'Memory in use',
        value: hostMemory.percent !== null && hostMemory.percent !== undefined ? `${Number(hostMemory.percent)}%` : 'N/A',
      }
    );
    if (typeof hostMemory.swap_total === 'number' && hostMemory.swap_total > 0) {
      hostSystemItems.push(
        { label: 'Swap total', value: formatBytes(hostMemory.swap_total as number) },
        { label: 'Swap free', value: formatBytes(hostMemory.swap_free as number) }
      );
    }
  }
  if (typeof data?.uptime === 'number') {
    hostSystemItems.push({ label: 'Node uptime', value: formatUptime(data.uptime) });
  }
  if (hostSystemItems.length === 0) {
    hostSystemItems.push({ label: '—', value: 'No host data' });
  }

  const processBitcoindItems: GroupedItem[] = [
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
  if (processBitcoindItems.length === 0) {
    processBitcoindItems.push({ label: '—', value: 'No process data' });
  }

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

  const formatIndexValue = (info: { synced?: boolean; best_block_height?: number } | undefined) => {
    if (!info) return 'Disabled';
    const synced = info.synced === true;
    const height = info.best_block_height;
    const heightStr = height !== null && height !== undefined ? height.toLocaleString() : '–';
    return `Enabled — ${synced ? 'Synced' : 'Syncing'} (block ${heightStr})`;
  };

  const indexingEntries: { label: string; value: unknown }[] = [];
  const seenKeys = new Set<string>();

  for (const { key, label } of KNOWN_INDEXES) {
    const info = indexing[key] as { synced?: boolean; best_block_height?: number } | undefined;
    indexingEntries.push({ label, value: formatIndexValue(info) });
    if (info !== undefined && info !== null) seenKeys.add(key);
  }

  for (const [name, info] of Object.entries(indexing)) {
    if (seenKeys.has(name)) continue;
    const obj = info as { synced?: boolean; best_block_height?: number } | undefined;
    indexingEntries.push({
      label: name.replace(/\b\w/g, (c) => c.toUpperCase()),
      value: formatIndexValue(obj),
    });
  }

  if (blockchain.verificationprogress !== null && blockchain.verificationprogress !== undefined) {
    indexingEntries.push({
      label: 'Chain sync progress',
      value: `${(Number(blockchain.verificationprogress) * 100).toFixed(2)}%`,
    });
  }
  if (indexingEntries.length === 0) {
    indexingEntries.push({ label: 'No indexes', value: 'N/A' });
  }

  const nodeWarning =
    network.warnings !== null && network.warnings !== undefined && String(network.warnings).trim() !== ''
      ? String(network.warnings).trim()
      : '';

  const { refreshTabId } = useRefreshState();
  const isRefreshing = loading && refreshTabId === 'node';

  return (
    <div className="relative space-y-4">
      <LoadingOverlay show={isRefreshing} />
      {nodeWarning !== '' ? (
        <div className="callout-warning" role="alert">
          {nodeWarning}
        </div>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard title="Node Status" items={networkCardItems} />
        <InfoCard title="Blockchain Status" items={blockchainCardItems} />
        <InfoCard title="Mempool Status" items={mempoolCardItems} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="Indexing Status" items={indexingEntries} />
        <GroupedInfoCard
          title="Host system & process"
          leftGroup={{ items: hostSystemItems }}
          rightGroup={{ heading: 'Process (bitcoind)', items: processBitcoindItems }}
        />
      </div>
    </div>
  );
}
