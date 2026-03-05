import { GITHUB_REPO_URL } from '@/constants';
import { SectionHeader } from '../SectionHeader';

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
            (hashrate, difficulty), peer list, optional wallet info, and basic host metrics.
          </p>
          <p className="text-level-5 max-w-prose">
            A Python backend runs next to your node (or on the same machine), stores block and
            network data in SQLite, and serves a REST API. The frontend you are viewing now calls that API and renders
            the Node, Blocks, Wallet, and Console tabs. You can run it locally for development or deploy it (e.g. on a
            Raspberry Pi) for always-on monitoring.
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
            <li>Optional wallet tab powered by Bitcoin Core wallet RPCs.</li>
          </ul>
        </section>

        <section className="mb-2">
          <h3 className="section-heading">
            More information
          </h3>
          <p className="text-level-5 mb-2">
            Full setup, Tor, deployment, and testing: <a href={`${GITHUB_REPO_URL}/blob/main/README.md`} className="link-accent" target="_blank" rel="noreferrer noopener">README on GitHub</a>.
          </p>
          <p className="text-level-5 mb-1">Related sites:</p>
          <ul className="list-disc list-inside text-level-5 space-y-1">
            <li><a href="https://mempool.space" className="link-accent" target="_blank" rel="noreferrer noopener">mempool.space</a> — block explorer &amp; mempool</li>
            <li><a href="https://www.blockchain.com/explorer" className="link-accent" target="_blank" rel="noreferrer noopener">blockchain.com</a> — explorer</li>
            <li><a href="https://bitcoin.org" className="link-accent" target="_blank" rel="noreferrer noopener">bitcoin.org</a> — Bitcoin project</li>
          </ul>
        </section>
      </article>
    </div>
  );
}

