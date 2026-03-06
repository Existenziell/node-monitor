import { useApi } from '@/contexts/ApiContext';
import type { NodeData } from '@/types';
import { useRefreshDone } from '@/contexts/RefreshContext';
import { useApiData } from '@/hooks/useApiData';
import { useTabData } from '@/hooks/useTabData';
import { LoadingErrorGate } from '@/components/LoadingErrorGate';
import { NodeTabContent } from '@/components/node/NodeTabContent';

export function NodeTab() {
  const { fetchNode } = useApi();
  const nodeState = useApiData<NodeData>(fetchNode);

  const { data, loading, error } = nodeState;
  useTabData(nodeState.load, 'node', data !== null && data !== undefined);

  useRefreshDone(loading, 'node');

  return (
    <LoadingErrorGate loading={loading} error={error} data={data} loadingLabel="node">
      {data !== null && data !== undefined ? <NodeTabContent data={data} loading={loading} /> : null}
    </LoadingErrorGate>
  );
}
