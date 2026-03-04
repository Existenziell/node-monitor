#!/usr/bin/env python3
"""
Centralized constants for backend
"""

import json
from pathlib import Path

# Load shared constants (ports, MAX_CONSOLE_LINES) from shared/constants.json
_shared_path = Path(__file__).resolve().parent.parent / "shared" / "constants.json"
if _shared_path.exists():
    with open(_shared_path, encoding="utf-8") as f:
        _shared = json.load(f)
    DASHBOARD_PORT = _shared["DASHBOARD_PORT"]
    API_SERVER_PORT = _shared["API_SERVER_PORT"]
    MAX_CONSOLE_LINES = _shared["MAX_CONSOLE_LINES"]
else:
    DASHBOARD_PORT = 8080
    API_SERVER_PORT = 8081
    MAX_CONSOLE_LINES = 100

# Cache and Rate Limiting Constants
CACHE_DURATION_SECONDS = 600  # 10 minutes
MIN_FETCH_INTERVAL_SECONDS = 10  # 10 seconds between API calls
PRICE_CACHE_DURATION = 600  # 10 minutes for price data
DATA_CACHE_DURATION = 300  # 5 minutes for general data

# Network and RPC Constants
DEFAULT_RPC_PORT = 8332
DEFAULT_RPC_TIMEOUT = 5  # seconds
DEFAULT_API_TIMEOUT = 5  # seconds
DEFAULT_REQUEST_TIMEOUT = 10  # seconds

# Monitoring Intervals
NODE_MONITOR_INTERVAL = 30  # seconds
BLOCKCHAIN_MONITOR_INTERVAL = 10  # seconds
WALLET_MONITOR_INTERVAL = 30  # seconds
DASHBOARD_REFRESH_INTERVAL = 30  # seconds

# File and Data Limits (MAX_CONSOLE_LINES set from shared above)
MAX_ERROR_LOG_ENTRIES = 100
MAX_OP_RETURN_TRANSACTIONS = 20  # Limit transactions checked for OP_RETURN

# Bitcoin Network Constants
BITCOIN_BLOCK_TIME_TARGET = 600  # 10 minutes in seconds
BITCOIN_HALVING_INTERVAL = 210000  # blocks
BITCOIN_GENESIS_BLOCK_HEIGHT = 0
BITCOIN_MAX_BLOCK_SIZE = 1000000  # 1MB in bytes
BITCOIN_MAX_BLOCK_WEIGHT = 4000000  # 4MWU

# Display Constants
DEFAULT_DISPLAY_WIDTH = 50
DEFAULT_INDENT = 2
DEFAULT_DECIMAL_PLACES = 8  # For BTC amounts

# API Endpoints
COINGECKO_API_URL = "https://api.coingecko.com/api/v3/simple/price"
YAHOO_FINANCE_TICKER = "BTC-USD"

# File Paths
DEFAULT_CONFIG_DIR = ".bitcoin_secure"
DEFAULT_DATA_DIR = "data"
BLOCKS_JSON_MAX_ENTRIES = 100
BLOCKS_DISPLAY_LIMIT = 20  # Max blocks returned by API / shown in frontend
DIFFICULTY_JSON_MAX_ENTRIES = 100

# SQLite (blocks/network/distribution when block monitor runs in API)
DEFAULT_SQLITE_DB = "data/node_monitor.db"

# Security Constants
CONFIG_FILE_PERMISSIONS = 0o600  # Owner read/write only
KEY_FILE_PERMISSIONS = 0o600
SERVICE_NAME = "bitcoin-node-rpc"

# Error Types
ERROR_TYPES = {
    "RPC_ERROR": "RPC_ERROR",
    "CONNECTION_ERROR": "CONNECTION_ERROR", 
    "CONFIG_ERROR": "CONFIG_ERROR",
    "API_ERROR": "API_ERROR",
    "FILE_ERROR": "FILE_ERROR",
    "VALIDATION_ERROR": "VALIDATION_ERROR",
    "PERMISSION_ERROR": "PERMISSION_ERROR",
    "TIMEOUT_ERROR": "TIMEOUT_ERROR",
    "IMPORT_ERROR": "IMPORT_ERROR",
    "NETWORK_ERROR": "NETWORK_ERROR",
    "CRITICAL_ERROR": "CRITICAL_ERROR",
    "WARNING": "WARNING"
}

# Retry Constants
MAX_RETRY_ATTEMPTS = 3
RETRY_BASE_DELAY = 2  # seconds
RETRY_MAX_DELAY = 30  # seconds
RETRY_BACKOFF_MULTIPLIER = 2

# API response cache (reduces RPC load on node, e.g. on Raspberry Pi)
NODE_CACHE_SECONDS = 30  # /api/node
WALLET_CACHE_SECONDS = 30  # /api/wallet
BLOCKS_CACHE_SECONDS = 60  # /api/blocks (SQLite-based)

# Web Dashboard Constants (DASHBOARD_PORT, API_SERVER_PORT from shared above)
API_SERVER_URL = f"http://localhost:{API_SERVER_PORT}"
API_HEALTH_ENDPOINT = "/api/health"
API_POOLS_SIGNATURES_ENDPOINT = "/api/pools/signatures"
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
}
