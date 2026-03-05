import { GITHUB_REPO_URL } from '@/constants';

export function DocsTab() {
  return (
    <div className="rounded-lg bg-level-2 border border-level-3 p-4 max-h-[70vh] overflow-y-auto">
      <h2 className="text-lg font-semibold text-accent mb-4">Node Monitor docs</h2>
      <article className="prose prose-sm max-w-none prose-headings:text-level-5 prose-p:text-level-5 prose-li:text-level-5">
        <section className="mb-4">
          <h3 className="text-base font-semibold text-level-5 mb-1">
            Overview
          </h3>
          <p className="text-sm text-level-5 mb-2">
            If you run your own Bitcoin Core node, you want a simple way to see that it is healthy,
            how far it has synced, who your peers are, and what the last blocks and mempool look like; without relying on
            third-party dashboards or leaving your local network.
          </p>
          <p className="text-sm text-level-5 mb-2">
            This dashboard is a web app that talks to your node over RPC (and ZMQ when available). 
            It shows chain and mempool status, recent blocks with mining pool attribution, network history
            (hashrate, difficulty), peer list, optional wallet info, and basic host metrics.
          </p>
          <p className="text-sm text-level-5">
            A Python backend runs next to your node (or on the same machine), stores block and
            network data in SQLite, and serves a REST API. The frontend you are viewing now calls that API and renders
            the Node, Blocks, Wallet, and Console tabs. You can run it locally for development or deploy it (e.g. on a
            Raspberry Pi) for always-on monitoring.
          </p>
        </section>

        <section className="mb-4">
          <h3 className="text-base font-semibold text-level-5 mb-1">
            Main features
          </h3>
          <ul className="list-disc list-inside text-sm text-level-5 space-y-1">
            <li>Real-time blockchain monitoring via ZMQ (with polling fallback).</li>
            <li>Recent blocks view with pool attribution and basic stats.</li>
            <li>Historical network view (hashrate, difficulty) from SQLite.</li>
            <li>Node/mempool status, peer list, and basic host metrics.</li>
            <li>Optional wallet tab powered by Bitcoin Core wallet RPCs.</li>
          </ul>
        </section>

        <section className="mb-2">
          <h3 className="text-base font-semibold text-level-5 mb-1">
            More information
          </h3>
          <p className="text-sm text-level-5 mb-2">
            Full setup, Tor, deployment, and testing: <a href={`${GITHUB_REPO_URL}/blob/main/README.md`} className="text-accent underline hover:no-underline" target="_blank" rel="noreferrer noopener">README on GitHub</a>.
          </p>
          <p className="text-sm text-level-5 mb-1">Related sites:</p>
          <ul className="list-disc list-inside text-sm text-level-5 space-y-1">
            <li><a href="https://mempool.space" className="text-accent underline hover:no-underline" target="_blank" rel="noreferrer noopener">mempool.space</a> — block explorer &amp; mempool</li>
            <li><a href="https://www.blockchain.com/explorer" className="text-accent underline hover:no-underline" target="_blank" rel="noreferrer noopener">blockchain.com</a> — explorer</li>
            <li><a href="https://bitcoin.org" className="text-accent underline hover:no-underline" target="_blank" rel="noreferrer noopener">bitcoin.org</a> — Bitcoin project</li>
          </ul>
        </section>
      </article>
    </div>
  );
}

