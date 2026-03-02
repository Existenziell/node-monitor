# Chain Monitor – Bitcoin Blockchain Monitoring Tools

A suite of tools for monitoring Bitcoin blockchain activity.

## 🚀 Features

### Blockchain Monitoring
- **Real-time blockchain monitoring** with ZMQ notifications (instant) or polling fallback
- **Enhanced block detection** - catches blocks immediately as they're found
- **Block statistics** with JSON storage (last 100 blocks) and pool distribution
- **Mining pool identification** from coinbase transactions
- **OP_RETURN data extraction** and analysis

### Bitcoin Graph Visualization
- **Interactive price charts** with USD/EUR currency switching
- **Bitcoin halving events** visualization
- **Linear/Logarithmic scale** options

### Price Data Management
- **Centralized price service** with caching
- **Multi-API fallbacks** (CoinGecko → Yahoo Finance)
- **Thread-safe** concurrent access for all monitors
- **Configurable rate limiting** to prevent API abuse

### Tor Network Integration
- **Dual network support** - accepts both clearnet and Tor connections
- **Automatic Tor management** - starts Tor service when needed

### Centralized Price Service
The project includes a **BitcoinPriceService** that consolidates all Bitcoin price fetching across the application:

## Requirements

### Python Dependencies
All Python dependencies can be installed with:
```bash
pip3 install -r requirements.txt
```

**Core packages** (monitoring): `requests`, `keyring`, `cryptography`, `pyzmq`  
**Graph visualization**: `yfinance`, `pandas`, `matplotlib`, `numpy`  
**Development**: `pylint` (optional)

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
   pip3 install -r requirements.txt
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

5. **Tor Integration (Optional but Recommended):**
   Your Bitcoin node is already configured for Tor support. Start Tor if needed (e.g. `brew services start tor` on macOS). 
   This allows your node to accept both clearnet and Tor connections simultaneously.

6. **Running the dashboard on Raspberry Pi (e.g. Start9 / Bitcoin Knots):**  
   See [RPC configuration for Pi](docs/README_RPC_PI.md) for config location, cache tuning, and Pi/Start9-specific setup.

## Usage

### Web Dashboard (primary)
```bash
cd frontend && npm install && npm run dev
```
This starts the Vite dev server and the Python API server (`python3 backend/api_server.py`). The dashboard proxies `/api` to the API server.

**Production / systemd (e.g. Raspberry Pi):** Run three processes: (1) API server: `python3 backend/api_server.py`, (2) frontend dev or built static (e.g. Vite or nginx serving `frontend/dist`), (3) block monitor for live data: `python3 backend/block_monitor.py --continuous`.

**Production build:** `cd frontend && npm run build` — then serve the contents of `frontend/dist/`.

### Block monitoring (feeds blocks/difficulty/distribution data to the dashboard)
```bash
# Continuous monitoring (tries ZMQ first, falls back to polling)
python3 backend/block_monitor.py --continuous

# Show current status once
python3 backend/block_monitor.py --status

# Custom ZMQ endpoint
python3 backend/block_monitor.py --continuous --zmq-endpoint tcp://127.0.0.1:28332

# Disable sound notifications
python3 backend/block_monitor.py --continuous --no-sound
```

**Troubleshooting ZMQ:**
- If ZMQ connection fails, the monitor automatically falls back to polling
- Ensure `pyzmq` is installed: `pip3 install pyzmq`
- Check that ZMQ is enabled in Bitcoin logs: `grep -i zmq ~/.bitcoin/debug.log`

**Configuration:** To set up RPC credentials (e.g. before first use), run: `python3 backend/config_service.py --setup`.

## Code Quality

### Linting
The project uses automated code quality checks:

**Python (Pylint)**
```bash
# Check all Python files
pylint backend/*.py

# Configuration in pylint.ini
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
