import type { Peer } from '@/types';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTh } from '@/components/SortableTh';

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

export function PeersTable({ peers }: { peers: Peer[] }) {
  const sort = useTableSort<Peer>({
    data: peers,
    keyExtractors: {
      address: (p) => (p.addr ?? '') || null,
      network: (p) => (p.network ?? '') || null,
      direction: (p) => (p.inbound === true ? 1 : p.inbound === false ? 0 : null),
      version: (p) => (p.subver ?? '') || null,
      connectionType: (p) => (p.connection_type ?? '') || null,
      connected: (p) => (p.conntime !== null && p.conntime !== undefined ? p.conntime : null),
      lastRecv: (p) => (p.lastrecv !== null && p.lastrecv !== undefined ? p.lastrecv : null),
      sent: (p) => (p.bytessent !== null && p.bytessent !== undefined ? p.bytessent : null),
      recv: (p) => (p.bytesrecv !== null && p.bytesrecv !== undefined ? p.bytesrecv : null),
      ping: (p) => (p.pingtime !== null && p.pingtime !== undefined && Number.isFinite(p.pingtime) ? p.pingtime : null),
      startingHeight: (p) => (p.startingheight !== null && p.startingheight !== undefined ? p.startingheight : null),
      transport: (p) => (p.transport_protocol_type ?? '') || null,
    },
    defaultSortKey: null,
  });

  if (peers.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-level-2 border border-level-3 overflow-hidden">
      <h3 className="text-sm font-medium text-accent p-4 pb-2">
        Peers ({peers.length})
      </h3>
      <div className="overflow-x-auto max-h-[60vh]">
        <table className="sortable-table w-full text-sm">
          <thead className="sticky top-0 bg-level-2 text-left">
            <tr>
              <SortableTh label="Address" sortKey="address" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
              <SortableTh label="Network" sortKey="network" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
              <SortableTh label="Direction" sortKey="direction" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
              <SortableTh label="Version" sortKey="version" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
              <SortableTh label="Connection type" sortKey="connectionType" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
              <SortableTh label="Connected" sortKey="connected" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
              <SortableTh label="Last recv" sortKey="lastRecv" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
              <SortableTh label="Sent" sortKey="sent" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
              <SortableTh label="Recv" sortKey="recv" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
              <SortableTh label="Ping" sortKey="ping" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
              <SortableTh label="Starting height" sortKey="startingHeight" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
              <SortableTh label="Transport" sortKey="transport" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
            </tr>
          </thead>
          <tbody>
            {sort.sortedData.map((peer, index) => (
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
  );
}
