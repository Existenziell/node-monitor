import {
  GITHUB_REPO_URL,
  BITCOIN_CORE_GITHUB_URL,
  BITCOIN_RPC_DOCS_URL,
  MEMPOOL_SPACE_BASE_URL,
  BLOCKCHAIN_EXPLORER_URL,
  BITCOIN_ORG_URL,
} from '@/data/links';
import { SectionHeader } from '@/components/SectionHeader';

const README_URL = `${GITHUB_REPO_URL}/blob/main/README.md`;

export function DocsTab() {
  return (
    <div className="section-container">
      <SectionHeader as="h2">Node Monitor docs</SectionHeader>
      <article className="prose prose-sm max-w-none prose-headings:text-level-5 prose-p:text-level-5 prose-li:text-level-5">
        <section className="mb-6">
          <h3 className="section-heading mt-6">
            Overview
          </h3>
          <p className="text-level-5 mb-2 max-w-prose">
            If you run your own Bitcoin Core node, you want a simple way to see that it is healthy,
            how far it has synced, who your peers are, and what the last blocks and mempool look like; without relying on
            third-party dashboards or leaving your local network.
          </p>
          <p className="text-level-5 mb-2 max-w-prose">
            This dashboard is a web app that talks to your node over RPC (and ZMQ when available).
            It shows chain and mempool status, recent blocks with mining pool attribution, network history
            (hashrate, difficulty), peer list, wallet info, and host metrics.
          </p>
        </section>

        <section className="mb-6">
          <h3 className="section-heading">
            Architecture
          </h3>
          <p className="text-level-5 mb-2 max-w-prose">
            The backend is Python: it runs a block monitor in a background thread, writes blocks and network
            history to SQLite (<code>data/node_monitor.db</code>), and serves a REST API. The frontend you are
            viewing (Vite/React) calls <code>/api</code> and renders the Node, Blocks, Wallet, and Console tabs.
            Your Bitcoin node is queried via RPC and, when configured, receives block and transaction notifications
            over ZMQ. You can run the dashboard locally for development or deploy it (e.g. on a Raspberry Pi) for
            always-on monitoring. Full setup steps are in the{' '}
            <a href={README_URL} className="link-accent" target="_blank" rel="noreferrer noopener">README on GitHub</a>.
          </p>
        </section>

        <section className="mb-6">
          <h3 className="section-heading">
            Main features
          </h3>
          <ul className="list-disc list-inside text-level-5 space-y-1">
            <li>Real-time blockchain monitoring via ZMQ (with polling fallback).</li>
            <li>Recent blocks view with pool attribution and basic stats.</li>
            <li>Historical network view (hashrate, difficulty) from SQLite.</li>
            <li>Node/mempool status, peer list, and basic host metrics.</li>
            <li>Wallet tab powered by Bitcoin Core wallet RPCs.</li>
          </ul>
        </section>

        <section className="mb-6">
          <h3 className="section-heading">
            Tabs at a glance
          </h3>
          <ul className="list-disc list-inside text-level-5 space-y-1">
            <li><strong>Node</strong> — chain sync, network info, mempool, peers, host metrics.</li>
            <li><strong>Network</strong> — historical hashrate and difficulty.</li>
            <li><strong>Blocks</strong> — recent blocks and mining pool attribution.</li>
            <li><strong>Wallet</strong> — Bitcoin Core wallet RPCs (balances, transactions).</li>
            <li><strong>Console</strong> — run Bitcoin Core RPC commands; see <a href={BITCOIN_RPC_DOCS_URL} className="link-accent" target="_blank" rel="noreferrer noopener">Bitcoin Core RPC reference</a> for the full API.</li>
            <li><strong>Docs</strong> — this page.</li>
            <li><strong>Settings</strong> — RPC and API configuration.</li>
          </ul>
        </section>

        <section className="mb-6">
          <p className="text-level-5 mb-1 mt-4">Bitcoin Core &amp; resources:</p>
          <ul className="list-disc list-inside text-level-5 space-y-1">
            <li><a href={BITCOIN_CORE_GITHUB_URL} className="link-accent" target="_blank" rel="noreferrer noopener">Bitcoin Core (GitHub)</a> — source code, releases, docs</li>
            <li><a href={BITCOIN_RPC_DOCS_URL} className="link-accent" target="_blank" rel="noreferrer noopener">Bitcoin Core RPC reference</a> — full RPC API for the Console tab</li>
          </ul>

          <p className="text-level-5 mb-1 mt-4">Explorers &amp; general:</p>
          <ul className="list-disc list-inside text-level-5 space-y-1">
            <li><a href={MEMPOOL_SPACE_BASE_URL} className="link-accent" target="_blank" rel="noreferrer noopener">mempool.space</a> — block explorer &amp; mempool</li>
            <li><a href={BLOCKCHAIN_EXPLORER_URL} className="link-accent" target="_blank" rel="noreferrer noopener">blockchain.com</a> — explorer</li>
            <li><a href={BITCOIN_ORG_URL} className="link-accent" target="_blank" rel="noreferrer noopener">bitcoin.org</a> — Bitcoin project</li>
          </ul>
        </section>
      </article>
    </div>
  );
}
