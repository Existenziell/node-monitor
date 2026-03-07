import {
  GITHUB_REPO_URL,
  BITCOIN_CORE_GITHUB_URL,
  BITCOIN_CONF_DOCS_URL,
  BITCOIN_RPC_DOCS_URL,
  MEMPOOL_SPACE_BASE_URL,
  BLOCKCHAIN_EXPLORER_URL,
  BITCOIN_ORG_URL,
} from '@/data/links';
import { SectionHeader } from '@/components/SectionHeader';
import { Link } from '@/components/Link';

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
            <Link href={README_URL} external className="link-accent">README on GitHub</Link>.
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
            <li><strong>Console</strong> — run Bitcoin Core RPC commands; see <Link href={BITCOIN_RPC_DOCS_URL} external className="link-accent">Bitcoin Core RPC reference</Link> for the full API.</li>
            <li><strong>Docs</strong> — this page.</li>
            <li><strong>Settings</strong> — RPC and API configuration.</li>
          </ul>
        </section>

        <section className="mb-6">
          <h3 className="section-heading">
            bitcoin.conf
          </h3>
          <p className="text-level-5 mb-2 max-w-prose">
            Your Bitcoin node is configured via <code>bitcoin.conf</code>. The following options are relevant for running this dashboard. Changes take effect after restarting the node.
          </p>
          <p className="text-level-5 mb-1 mt-4"><strong>File location</strong></p>
          <ul className="list-disc list-inside text-level-5 space-y-1 mb-4">
            <li>Linux: <code>~/.bitcoin/bitcoin.conf</code></li>
            <li>macOS: <code>~/Library/Application Support/Bitcoin/bitcoin.conf</code></li>
            <li>Windows: <code>%APPDATA%\Bitcoin\bitcoin.conf</code></li>
          </ul>

          <p className="text-level-5 mb-1 mt-4"><strong>RPC (required)</strong></p>
          <p className="text-level-5 mb-2 max-w-prose">
            The dashboard talks to your node over RPC. Enable the RPC server and choose either cookie-based auth (recommended) or username/password. After editing, run <code>python3 backend/config_service.py --setup</code> so the dashboard can connect.
          </p>
          <pre className="code-block"><code>{`# Enable JSON-RPC server
server=1

# Option A: cookie auth (default; node writes .cookie in datadir)
# No extra options needed; config_service discovers the cookie.

# Option B: legacy username/password
# rpcuser=myuser
# rpcpassword=mypassword

# If the dashboard runs on another host, bind and allow that IP (default port 8332)
# rpcbind=0.0.0.0
# rpcallowip=192.168.1.0/24`}</code></pre>

          <p className="text-level-5 mb-1 mt-4"><strong>ZMQ (recommended for real-time blocks)</strong></p>
          <p className="text-level-5 mb-2 max-w-prose">
            With ZMQ enabled, the block monitor gets new-block notifications instantly instead of polling. Add these lines (then restart the node). The dashboard subscribes to <code>hashblock</code>; the other topics are optional for future use.
          </p>
          <pre className="code-block"><code>{`zmqpubhashblock=tcp://0.0.0.0:28332
zmqpubhashtx=tcp://0.0.0.0:28333
zmqpubrawblock=tcp://0.0.0.0:28334
zmqpubrawtx=tcp://0.0.0.0:28335`}</code></pre>

          <p className="text-level-5 mb-1 mt-4"><strong>Tor (optional)</strong></p>
          <p className="text-level-5 mb-2 max-w-prose">
            To route your node’s traffic over Tor, install and start Tor, then add the following. With <code>listen=1</code> and <code>onion=...</code>, the node can also accept incoming connections from other Tor nodes.
          </p>
          <pre className="code-block"><code>{`# Use Tor for outbound connections
proxy=127.0.0.1:9050

# Optional: accept incoming connections over Tor
listen=1
onion=127.0.0.1:8336`}</code></pre>

          <p className="text-level-5 mb-2 mt-4">
            For the full list of options, see the <Link href={BITCOIN_CONF_DOCS_URL} external className="link-accent">Bitcoin Core bitcoin.conf reference</Link>.
          </p>
        </section>

        <section className="mb-6">
          <p className="text-level-5 mb-1 mt-4">Bitcoin Core &amp; resources:</p>
          <ul className="list-disc list-inside text-level-5 space-y-1">
            <li><Link href={BITCOIN_CORE_GITHUB_URL} external className="link-accent">Bitcoin Core (GitHub)</Link> — source code, releases, docs</li>
            <li><Link href={BITCOIN_RPC_DOCS_URL} external className="link-accent">Bitcoin Core RPC reference</Link> — full RPC API for the Console tab</li>
          </ul>

          <p className="text-level-5 mb-1 mt-4">Explorers &amp; general:</p>
          <ul className="list-disc list-inside text-level-5 space-y-1">
            <li><Link href={MEMPOOL_SPACE_BASE_URL} external className="link-accent">mempool.space</Link> — block explorer &amp; mempool</li>
            <li><Link href={BLOCKCHAIN_EXPLORER_URL} external className="link-accent">blockchain.com</Link> — explorer</li>
            <li><Link href={BITCOIN_ORG_URL} external className="link-accent">bitcoin.org</Link> — Bitcoin project</li>
          </ul>
        </section>
      </article>
    </div>
  );
}
