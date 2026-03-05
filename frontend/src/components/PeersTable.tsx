import type { Peer } from '@/types';
import { useTableSort } from '@/hooks/useTableSort';
import { SectionHeader } from '@/components/SectionHeader';
import { SortableTh } from '@/components/SortableTh';
import { formatBytes } from '@/utils';

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
    <div className="section-container">
      <SectionHeader>Peers ({peers.length})</SectionHeader>
      <div className="overflow-x-auto max-h-[60vh]">
        <table className="sortable-table w-full text-sm">
          <thead className="sticky top-0 bg-level-2 text-left">
            <tr>
              <SortableTh label="Address" sortKey="address" currentSortKey={sort.sortKey} sortDir={sort.sortDir} onSort={sort.setSort} className="px-2 py-3 text-level-4" />
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
                className="table-row-hover"
              >
                <td className="table-cell font-mono truncate max-w-[180px]" title={peer.addr ?? ''}>
                  {peer.addr ?? '-'}
                </td>
                <td className="table-cell truncate max-w-[140px]" title={peer.subver ?? ''}>
                  {formatSubver(peer.subver)}
                </td>
                <td className="table-cell">{peer.connection_type ?? '-'}</td>
                <td className="table-cell">{formatPeerTime(peer.conntime)}</td>
                <td className="table-cell">{formatPeerTime(peer.lastrecv)}</td>
                <td className="table-cell">{formatBytes(peer.bytessent)}</td>
                <td className="table-cell">{formatBytes(peer.bytesrecv)}</td>
                <td className="table-cell">
                  {peer.pingtime !== null && peer.pingtime !== undefined && Number.isFinite(peer.pingtime) ? `${Number(peer.pingtime).toFixed(0)} ms` : '-'}
                </td>
                <td className="table-cell">
                  {peer.startingheight !== null && peer.startingheight !== undefined && Number.isFinite(peer.startingheight) ? Number(peer.startingheight).toLocaleString() : '-'}
                </td>
                <td className="table-cell">{peer.transport_protocol_type ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
