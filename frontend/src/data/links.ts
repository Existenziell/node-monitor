import shared from '@shared/constants.json';

export const MEMPOOL_SPACE_BASE_URL = shared.MEMPOOL_SPACE_BASE_URL as string;

export const GITHUB_REPO_URL = 'https://github.com/Existenziell/node-monitor';
export const BITCOIN_CORE_GITHUB_URL = 'https://github.com/bitcoin/bitcoin';
export const BITCOIN_RPC_DOCS_URL = 'https://developer.bitcoin.org/reference/rpc/';
export const BLOCKCHAIN_EXPLORER_URL = 'https://www.blockchain.com/explorer';
export const BITCOIN_ORG_URL = 'https://bitcoin.org';
export const DASHBOARD_LINK_URL = 'http://dashboard.local:8001/';
export const BITCOINDEV_INFO_URL = 'https://bitcoindev.info/';
export const CHRISTOF_DIGITAL_URL = 'https://christof.digital/';

export const FOOTER_LEFT_LINKS = [
  { href: MEMPOOL_SPACE_BASE_URL, label: 'mempool.space' },
  { href: DASHBOARD_LINK_URL, label: 'Miner Dashboard' },
] as const;

export const FOOTER_RIGHT_LINKS = [
  { href: BITCOINDEV_INFO_URL, label: 'BitcoinDev' },
  { href: CHRISTOF_DIGITAL_URL, label: 'christof.digital' },
] as const;
