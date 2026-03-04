# Node Monitor – Bitcoin Node Monitoring Tools

A suite of tools for monitoring Bitcoin blockchain activity.

## Features

### Blockchain Monitoring
- **Real-time blockchain monitoring** with ZMQ notifications (instant) or polling fallback
- **Enhanced block detection** - catches blocks immediately as they're found
- **Block statistics** with SQLite storage (`data/node_monitor.db`, last 100 blocks) and pool distribution
- **Mining pool identification** from coinbase transactions
- **OP_RETURN data extraction** and analysis

### Tor Network Integration
- **Dual network support** - accepts both clearnet and Tor connections
- **Automatic Tor management** - starts Tor service when needed

## Requirements

### Python Dependencies
All Python dependencies can be installed with:
```bash
pip3 install -r backend/requirements.txt
```

**Core packages** (monitoring): `requests`, `keyring`, `cryptography`, `pyzmq`  
**Graph visualization**: `yfinance`, `pandas`, `matplotlib`, `numpy`  
**Development**: `pylint` (optional)  
**Testing**: `pytest`, `pytest-cov` (see [Testing](#testing))

### JavaScript Dependencies
For the web dashboard, JavaScript dependencies can be installed with:
```bash
cd frontend
npm install
```

**Development**: `eslint` (for code quality checks)  

## Setup

### Blockchain Monitoring Setup
1. **Configure secure RPC credentials:**
   ```bash
   python3 backend/config_service.py --setup
   ```

2. **Install Python dependencies:**
   ```bash
   pip3 install -r backend/requirements.txt
   ```

3. **Configure ZMQ for real-time monitoring (optional but recommended):**
   Add to your `bitcoin.conf`:
   ```ini
   # ZMQ Notifications for real-time block monitoring
   zmqpubhashblock=tcp://127.0.0.1:28332
   zmqpubhashtx=tcp://127.0.0.1:28333
   ```
   Then restart Bitcoin Node for ZMQ to take effect.

   **Verify ZMQ is working:**
   ```bash
   # Check if ZMQ is mentioned in the logs
   grep -i zmq ~/.bitcoin/debug.log
   
   # Check Bitcoin help for ZMQ options
   bitcoind -h | grep zmq
   ```

4. **Install JavaScript dependencies (for web dashboard):**
   ```bash
   cd frontend
   npm install
   ```

5. **Tor (optional):** See [How to enable Tor](#how-to-enable-tor) below.

## Usage

### Web Dashboard (primary)
```bash
cd frontend && npm install && npm run dev
```
This starts the Vite dev server and the Python API server (`python3 backend/api_server.py`). The dashboard proxies `/api` to the API server.

**Local dev with node on another machine (e.g. Pi):** To point the API at the Pi’s node when running `npm run dev` locally, set `RPC_HOST` (and optionally `RPC_PORT`) and `ZMQ_ENDPOINT` before starting. Example (Unix):
```bash
export RPC_HOST=192.168.1.5
export ZMQ_ENDPOINT=tcp://192.168.1.5:28332
cd frontend && npm run dev
```
Or in one line: `RPC_HOST=node.local ZMQ_ENDPOINT=tcp://node.local:28332 npm run dev`. Auth (cookie or user/password) still comes from your saved config; only the host/port are overridden.

**Production / systemd (e.g. Raspberry Pi):** Use the service files in `deploy/` for the API (port 8003) and dashboard (port 8002). The block monitor runs inside the API process and writes to SQLite. See [deploy/README.md](deploy/README.md) and [deploy/PI_PREPARATION.md](deploy/PI_PREPARATION.md) for install steps. Copy the two `.service` files to `/etc/systemd/system/`, run `npm run build` in `frontend/`, then enable and start the services.

**Production build:** `cd frontend && npm run build` — then serve the contents of `frontend/dist/`.

### Block and network data (SQLite)
Blocks, network history (hashrate/difficulty), and pool distribution are stored in **`data/node_monitor.db`** (SQLite). When you run the dashboard with `npm run dev`, the API server starts the block monitor in a background thread and writes to this DB. No separate block-monitor process is required. The DB is created automatically; the last 100 blocks and 100 network snapshots are kept.

**Viewing the DB (e.g. on the Pi):** From the project root, use the `sqlite3` CLI (install with `sudo apt install sqlite3` if needed):
```bash
cd /home/pi/projects/node-monitor   # or your repo path
sqlite3 data/node_monitor.db
```
Then run `.tables` to list tables (`blocks`, `network_history`), or for example:
```sql
SELECT block_height, block_hash, created_at FROM blocks ORDER BY block_height DESC LIMIT 5;
SELECT * FROM network_history ORDER BY id DESC LIMIT 5;
```
Type `.quit` to exit.

### Block monitoring (standalone, optional)
For standalone monitoring (e.g. without the dashboard), or to show status once:
```bash
# Continuous monitoring (default; tries ZMQ first, falls back to polling)
python3 backend/monitor_node.py

# Optional: polling interval in seconds (default 10)
python3 backend/monitor_node.py --interval 5

# Show current status once and exit
python3 backend/monitor_node.py --status

# Custom ZMQ endpoint
python3 backend/monitor_node.py --zmq-endpoint tcp://127.0.0.1:28332
```
Standalone mode also writes to `data/node_monitor.db` if the API is not running.

**Troubleshooting ZMQ:**
- If ZMQ connection fails, the monitor automatically falls back to polling
- Ensure `pyzmq` is installed: `pip3 install pyzmq`
- Check that ZMQ is enabled in Bitcoin logs: `grep -i zmq ~/.bitcoin/debug.log`

**Configuration:** To set up RPC credentials (e.g. before first use), run: `python3 backend/config_service.py --setup`.

### How to enable Tor

Enabling Tor lets your **Bitcoin node** connect to the network over Tor (and optionally accept incoming connections from other Tor nodes). node-monitor does not run Tor itself; it only talks to your node via RPC (and ZMQ) on the host you configured.

**1. Install and start Tor**

- **Raspberry Pi / Debian:**  
  ```bash
  sudo apt update && sudo apt install -y tor
  sudo systemctl enable --now tor
  ```
  Tor listens on `127.0.0.1:9050` (SOCKS5) by default.

- **macOS (Homebrew):**  
  ```bash
  brew install tor
  brew services start tor
  ```

**2. Point Bitcoin Core at Tor**

In your node’s `bitcoin.conf` (e.g. `~/.bitcoin/bitcoin.conf` or the path used by your node):

```ini
# Use Tor for outbound connections
proxy=127.0.0.1:9050

# Optional: also accept incoming connections over Tor (run as a reachable node)
listen=1
onion=127.0.0.1:8336
```

Restart the Bitcoin node so it picks up the new settings. The node will then use Tor for outbound traffic; with `listen=1` and `onion=...` it can receive connections from other Tor nodes.

**3. Verify**

- Tor is running: `sudo systemctl status tor` (Linux) or `brew services list` (macOS).
- Bitcoin is using the proxy: check the node logs for Tor-related messages, or run `getnetworkinfo` via RPC and look at `network` / proxy info.

**Note:** RPC and ZMQ between node-monitor and your node stay on the addresses you configured (e.g. `127.0.0.1` or the node’s LAN IP). Tor only affects the node’s own peer connections.

### Running node-monitor on a different machine (e.g. Pi3 + Pi5)
You can run node-monitor (and miner-dashboard) on one Pi while the Bitcoin node runs on another.

**Example:** Pi5 = node (Knots); Pi3 = dashboard (node-monitor + miner-dashboard). If the Pi3 hostname is `dashboard`, use **http://dashboard.local:8002**.

1. **On the Bitcoin node (Pi5)** – allow RPC and ZMQ from the monitor’s IP (e.g. Pi3’s LAN IP). In `bitcoin.conf`:
   ```ini
   # Allow RPC from Pi3 only (use Pi3's actual IP)
   rpcallowip=192.168.1.10
   rpcbind=0.0.0.0
   rpcuser=youruser
   rpcpassword=yourpassword

   # ZMQ for block notifications (bind all so Pi3 can connect)
   zmqpubhashblock=tcp://0.0.0.0:28332
   ```
   Restart the node. Ensure the firewall on Pi5 allows port **8332** (RPC) and **28332** (ZMQ) from Pi3.

2. **On the monitor (Pi3)** – configure node-monitor to use the node’s IP:
   - **Settings tab:** set **RPC Host** to Pi5’s IP or hostname (e.g. `192.168.1.5` or `bitcoin-pi.local`), **RPC Port** to `8332`, and use **Username / Password** with the same `rpcuser` / `rpcpassword` as on Pi5. (Cookie auth is file-based on the node; for a remote client, username/password is simpler.)
   - **ZMQ:** the block monitor (inside the API) connects to ZMQ for instant block notifications. Set the environment variable **`ZMQ_ENDPOINT`** before starting the API, e.g. in your systemd service file:
     ```ini
     [Service]
     Environment="ZMQ_ENDPOINT=tcp://192.168.1.5:28332"
     ExecStart=...
     ```
     Replace `192.168.1.5` with Pi5’s IP. If `ZMQ_ENDPOINT` is not set, it defaults to `tcp://127.0.0.1:28332` (local node). Without ZMQ, the monitor falls back to polling the RPC every 10 seconds.

3. **Result:** Pi3 runs only the two services (API + dashboard). All RPC and ZMQ traffic goes over the LAN to Pi5. Block and network data are stored in SQLite on Pi3 (`data/node_monitor.db`).

**Security:** Restrict `rpcallowip` to the monitor’s IP only; use a strong RPC password; keep both devices on a trusted network.

**"Connection failed" / "Bitcoin node is not responding":** The dashboard shows which host:port the API is using (e.g. `connecting to 127.0.0.1:8332`). If the node runs on another machine, open **Settings**, set **RPC Host** to that machine's IP or hostname, save, and reload. On the node, ensure `bitcoin.conf` has `rpcallowip` and `rpcbind` as above and the firewall allows port 8332 from the dashboard machine.

## Testing

Backend Python tests use **pytest** and live in `backend/tests/`.

**Run all backend tests (from repo root):**
```bash
pip3 install -r backend/requirements-dev.txt
python3 -m pytest backend/tests -v
```

**Run with coverage:**
```bash
python3 -m pytest backend/tests -v --cov=backend --cov-report=term-missing
```

**Layout and conventions:**
- Test files: `backend/tests/test_*.py` (e.g. `test_data_service.py`, `test_error_service.py`, `test_rpc_service.py`).
- Shared fixtures (sample data, mocks): `backend/tests/conftest.py`.
- Helpers/fakes: `backend/tests/helpers/` (e.g. `FakeRPCService` for tests that need an in-memory RPC).
- External I/O (RPC, HTTP, filesystem) is mocked via `monkeypatch` and `unittest.mock` so tests run without a live node or network.

See `pytest.ini` at the repo root for `testpaths` and `pythonpath`.

## Code Quality

### Linting
The project uses automated code quality checks:

**Python (Pylint)**
```bash
# Check all Python files
cd backend && pylint *.py

# Configuration in backend/pylint.ini
```

**JavaScript (ESLint)**
```bash
# Check all JavaScript files
cd frontend && npm run lint

# Auto-fix issues
cd frontend && npm run lint:fix

# Configuration in frontend/.eslintrc.cjs
```

### Pre-commit Hooks
Git pre-commit hooks automatically run linting checks before each commit:
- **Pylint** checks all staged Python files
- **ESLint** checks all staged JavaScript files
- Commits are blocked if linting issues are found

The pre-commit hook is located at `.git/hooks/pre-commit` and runs automatically.
