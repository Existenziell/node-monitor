import type { TabId, TabWithLabel } from '@/types';

export const TABS: TabWithLabel[] = [
  { id: 'node', label: 'Node' },
  { id: 'network', label: 'Network' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'console', label: 'Console' },
  { id: 'docs', label: 'Docs' },
  { id: 'settings', label: 'Settings' },
];

export const VALID_TABS: TabId[] = TABS.map((t) => t.id);
