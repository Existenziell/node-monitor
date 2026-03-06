#!/usr/bin/env python3
"""
API Server for Bitcoin monitoring data
Provides JSON endpoints for node and wallet data.
Runs the block monitor inside this process (SQLite for blocks/network/distribution).
"""

import json
import sys
import os
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from urllib.request import urlopen
from urllib.error import URLError, HTTPError

# Ensure backend directory is on path (when run as python3 backend/api_server.py)
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

try:
    from rpc_service import create_rpc_connection  # pyright: ignore[reportMissingImports]
    from config_service import config_service  # pyright: ignore[reportMissingImports]
    from constants import (  # pyright: ignore[reportMissingImports]
        API_SERVER_PORT,
        DEFAULT_RPC_PORT,
        DEFAULT_ZMQ_ENDPOINT,
        MEMPOOL_SPACE_API_URL,
        NODE_CACHE_SECONDS,
        WALLET_CACHE_SECONDS,
        BLOCKS_CACHE_SECONDS,
        BLOCKS_DISPLAY_LIMIT,
    )
    from block_store import (  # pyright: ignore[reportMissingImports]
        init_schema,
        get_recent_blocks,
        get_network_history,
        get_distribution,
    )
    from event_broadcaster import subscribe as events_subscribe, unsubscribe as events_unsubscribe  # pyright: ignore[reportMissingImports]

except Exception as e:
    print(f"Import error: {e}")
    print(f"Backend path: {_backend_dir}")
    print(f"Available files: {os.listdir(_backend_dir) if os.path.exists(_backend_dir) else 'Path does not exist'}")
    sys.exit(1)

class BitcoinAPIHandler(BaseHTTPRequestHandler):
    """HTTP request handler for Bitcoin monitoring API"""

    def __init__(self, *args, **kwargs):
        self.rpc_service = create_rpc_connection()
        self._blocks_cache = None
        self._blocks_cache_time = None
        self._distribution_cache = None
        self._distribution_cache_time = None
        self._node_cache = None
        self._node_cache_time = None
        self._wallet_cache = None
        self._wallet_cache_time = None
        self._pools_data = None
        self._price_cache = None
        self._price_cache_time = None
        super().__init__(*args, **kwargs)

    def do_GET(self):  # pylint: disable=invalid-name
        """Handle GET requests"""
        try:
            parsed_path = urlparse(self.path)
            path = parsed_path.path

            if path == '/api/events':
                self.handle_events_sse()
                return

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

            if path == '/api/node':
                self.handle_node_data()
            elif path == '/api/wallet':
                self.handle_wallet_data()
            elif path == '/api/blocks':
                self.handle_blocks_data()
            elif path == '/api/network':
                self.handle_network_data()
            elif path == '/api/distribution':
                self.handle_distribution_data()
            elif path == '/api/health':
                self.handle_health()
            elif path == '/api/price':
                self.handle_price()
            elif path == '/api/config/status':
                self.handle_config_status()
            elif path == '/api/config/test':
                self.handle_config_test()
            elif path == '/api/pools':
                self.handle_pools_data()
            elif path == '/api/pools/signatures':
                self.handle_pools_signatures()
            elif path.startswith('/api/pools/name/'):
                self.handle_pool_by_name(path)
            elif path.startswith('/api/pools/signature/'):
                self.handle_pool_by_signature(path)
            else:
                self.send_error(404, "Not Found")

        except Exception as e:
            self.send_error(500, f"Internal Server Error: {str(e)}")

    def handle_events_sse(self):
        """Stream server-sent events (e.g. new_block) to the client."""
        import queue as queue_module
        event_queue = events_subscribe()
        try:
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            while True:
                try:
                    event = event_queue.get(timeout=15)
                    self.wfile.write(f"data: {json.dumps(event)}\n\n".encode('utf-8'))
                    self.wfile.flush()
                except queue_module.Empty:
                    self.wfile.write(b": keepalive\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            events_unsubscribe(event_queue)

    def _send_cors_headers(self):
        """Send CORS headers for cross-origin requests."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):  # pylint: disable=invalid-name
        """Handle CORS preflight."""
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):  # pylint: disable=invalid-name
        """Handle POST requests (e.g. /api/rpc, /api/config)."""
        try:
            parsed_path = urlparse(self.path)
            path = parsed_path.path

            if path == '/api/config':
                self.handle_config_save()
                return

            if path == '/api/config/wallet':
                self.handle_config_wallet_save()
                return

            if path != '/api/rpc':
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Not Found"}).encode())
                return

            content_length = int(self.headers.get('Content-Length', 0))
            if content_length <= 0:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing or invalid body"}).encode())
                return

            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode('utf-8'))
            except (ValueError, UnicodeDecodeError):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
                return

            method = data.get('method')
            if not method or not isinstance(method, str):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Missing or invalid 'method'"}).encode())
                return

            params = data.get('params')
            if params is None:
                params = []
            if not isinstance(params, list):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "'params' must be an array"}).encode())
                return

            if self.rpc_service is None:
                self._send_no_config_response()
                return

            result = self.rpc_service.rpc_call(method, params)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(result, indent=2).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def handle_health(self):
        """Health check endpoint"""
        response = {
            "status": "ok",
            "message": "Bitcoin API Server is running"
        }
        self.wfile.write(json.dumps(response).encode())

    def _send_no_config_response(self):
        """Send JSON response when RPC is not configured."""
        body = {
            "status": "error",
            "code": "NO_CONFIG",
            "message": "RPC not configured. Use Settings to configure your node."
        }
        self.wfile.write(json.dumps(body).encode())

    def handle_config_status(self):
        """GET /api/config/status - safe config status for frontend (no secrets)."""
        try:
            status = config_service.get_config_status()
            if self.rpc_service is not None:
                try:
                    list_result = self.rpc_service.list_wallets()
                    loaded = list_result.get('result') if 'result' in list_result else []
                    if not isinstance(loaded, list):
                        loaded = []
                    status["loaded_wallets"] = [str(w) for w in loaded]
                except Exception:
                    status["loaded_wallets"] = []
            self.wfile.write(json.dumps(status).encode())
        except Exception as e:
            self.wfile.write(json.dumps({
                "config_exists": False,
                "auth_method": None,
                "rpc_host": None,
                "rpc_port": None,
                "rpc_user_masked": None,
                "cookie_file": None,
                "node_configured": False,
                "error": str(e)
            }).encode())

    def handle_config_test(self):
        """GET /api/config/test - test RPC connection and return node version if successful."""
        if self.rpc_service is None:
            self.wfile.write(json.dumps({
                "ok": False,
                "error": "RPC not configured. Use Settings to configure your node."
            }).encode())
            return
        try:
            blockchain_info = self.rpc_service.get_blockchain_info()
            if "error" in blockchain_info and blockchain_info["error"]:
                err = blockchain_info["error"]
                msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)
                self.wfile.write(json.dumps({"ok": False, "error": msg}).encode())
                return
            network_info = self.rpc_service.get_network_info()
            if "error" in network_info and network_info["error"]:
                err = network_info["error"]
                msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)
                self.wfile.write(json.dumps({"ok": False, "error": msg}).encode())
                return
            result = network_info.get("result") if isinstance(network_info.get("result"), dict) else {}
            version = result.get("subversion", "").strip("/") or None
            self.wfile.write(json.dumps({"ok": True, "version": version}).encode())
        except Exception as e:
            self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode())

    def handle_config_save(self):
        """POST /api/config - save config from Settings form."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length <= 0:
            self.wfile.write(json.dumps({"ok": False, "error": "Missing body"}).encode())
            return
        try:
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            self.wfile.write(json.dumps({"ok": False, "error": "Invalid JSON"}).encode())
            return
        auth_method = (data.get('auth_method') or 'password').strip().lower()
        if auth_method not in ('password', 'cookie'):
            self.wfile.write(json.dumps({"ok": False, "error": "auth_method must be 'password' or 'cookie'"}).encode())
            return
        try:
            rpc_port = int(data.get('rpc_port', DEFAULT_RPC_PORT))
        except (ValueError, TypeError):
            self.wfile.write(json.dumps({"ok": False, "error": "rpc_port must be a number"}).encode())
            return
        rpc_host = (data.get('rpc_host') or '').strip() or None
        rpc_user = data.get('rpc_user') or None
        rpc_password = data.get('rpc_password') or None
        cookie_file = data.get('cookie_file') or None
        ok, err = config_service.save_config_from_api(
            auth_method=auth_method,
            rpc_port=rpc_port,
            rpc_host=rpc_host,
            rpc_user=rpc_user,
            rpc_password=rpc_password,
            cookie_file=cookie_file,
        )
        if ok:
            self.wfile.write(json.dumps({"ok": True}).encode())
        else:
            self.wfile.write(json.dumps({"ok": False, "error": err}).encode())

    def handle_node_data(self):  # pylint: disable=too-many-locals
        """Handle node monitoring data requests (cached to reduce RPC load)."""
        if self.rpc_service is None:
            self._send_no_config_response()
            return
        try:
            from datetime import datetime
            now = datetime.now()
            if (self._node_cache is not None and self._node_cache_time is not None and
                    (now - self._node_cache_time).total_seconds() < NODE_CACHE_SECONDS):
                self.wfile.write(json.dumps(self._node_cache, indent=2).encode())
                return

            blockchain_info = self.rpc_service.get_blockchain_info()
            network_info = self.rpc_service.get_network_info()
            mempool_info = self.rpc_service.get_mempool_info()
            memory_info = self.rpc_service.get_memory_info()
            index_info = self.rpc_service.get_index_info()
            hashrate_info = self.rpc_service.get_network_hashrate()
            peer_info = self.rpc_service.get_peer_info()
            connection_count_info = self.rpc_service.get_connection_count()
            uptime_info = self.rpc_service.uptime()
            net_totals_info = self.rpc_service.get_net_totals()
            host_memory = self._get_host_memory()
            host_architecture = self._get_host_architecture()

            if self._check_connection_error(blockchain_info, "blockchain info"):
                return

            if self._check_connection_error(network_info, "network info"):
                return

            uptime = uptime_info.get('result') if 'result' in uptime_info and uptime_info.get('error') is None else None
            net_totals = net_totals_info.get('result') if 'result' in net_totals_info and net_totals_info.get('error') is None else None
            connection_count = connection_count_info.get('result') if 'result' in connection_count_info and connection_count_info.get('error') is None else None

            response = {
                "status": "success",
                "data": {
                    "blockchain": blockchain_info.get('result') if 'result' in blockchain_info else None,
                    "network": network_info.get('result') if 'result' in network_info else None,
                    "mempool": mempool_info.get('result') if 'result' in mempool_info else None,
                    "memory": memory_info.get('result') if 'result' in memory_info else None,
                    "host_memory": host_memory,
                    "host_architecture": host_architecture,
                    "indexing": index_info.get('result') if 'result' in index_info else None,
                    "hashrate": hashrate_info.get('result') if 'result' in hashrate_info else None,
                    "peers": peer_info.get('result') if 'result' in peer_info else [],
                    "uptime": uptime,
                    "nettotals": net_totals,
                    "connection_count": connection_count
                }
            }
            self._node_cache = response
            self._node_cache_time = now
            self.wfile.write(json.dumps(response, indent=2).encode())

        except Exception as e:
            error_response = {
                "status": "error",
                "message": f"Failed to get node data: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response).encode())

    def _is_no_wallet_error(self, wallet_info):
        """Return True if the response indicates no wallet is loaded (Bitcoin Core -18 or message)."""
        if 'error' not in wallet_info or not wallet_info['error']:
            return False
        err = wallet_info['error']
        if isinstance(err, dict):
            if err.get('code') == -18:
                return True
            msg = (err.get('message') or '').lower()
            return 'no wallet' in msg or 'not loaded' in msg
        msg = str(err).lower()
        return 'no wallet' in msg or 'not loaded' in msg

    def handle_wallet_data(self):
        """Handle wallet monitoring data requests (cached to reduce RPC load)."""
        if self.rpc_service is None:
            self._send_no_config_response()
            return
        try:
            from datetime import datetime
            now = datetime.now()
            if (self._wallet_cache is not None and self._wallet_cache_time is not None and
                    (now - self._wallet_cache_time).total_seconds() < WALLET_CACHE_SECONDS):
                self.wfile.write(json.dumps(self._wallet_cache, indent=2).encode())
                return

            # No default wallet in config: show "no wallet selected" and list of loaded wallets
            if not self.rpc_service.wallet_name:
                list_result = self.rpc_service.list_wallets()
                wallets = list_result.get('result') if 'result' in list_result else []
                if not isinstance(wallets, list):
                    wallets = []
                wallets = [str(w) for w in wallets]
                no_wallet_response = {
                    "status": "success",
                    "data": {"noWallet": True, "wallets": wallets, "loadedWallets": wallets}
                }
                self.wfile.write(json.dumps(no_wallet_response, indent=2).encode())
                return

            # Get wallet info first; if no wallet loaded, return list of wallets for frontend
            wallet_info = self.rpc_service.get_wallet_info()
            if self._is_no_wallet_error(wallet_info):
                list_result = self.rpc_service.list_wallets()
                wallets = list_result.get('result') if 'result' in list_result else []
                if not isinstance(wallets, list):
                    wallets = []
                wallets = [str(w) for w in wallets]
                no_wallet_response = {
                    "status": "success",
                    "data": {"noWallet": True, "wallets": wallets, "loadedWallets": wallets}
                }
                self.wfile.write(json.dumps(no_wallet_response, indent=2).encode())
                return

            if self._check_connection_error(wallet_info, "wallet info"):
                return

            balance = self.rpc_service.get_balance()
            balances = self.rpc_service.get_balances()
            unspent = self.rpc_service.get_unspent_outputs()
            transactions = self.rpc_service.list_transactions("*", 100)

            if self._check_connection_error(balance, "balance"):
                return

            balances_result = balances.get('result') if 'result' in balances and balances.get('error') is None else None

            list_result = self.rpc_service.list_wallets()
            loaded_wallets = list_result.get('result') if 'result' in list_result else []
            if not isinstance(loaded_wallets, list):
                loaded_wallets = []
            loaded_wallets = [str(w) for w in loaded_wallets]

            response = {
                "status": "success",
                "data": {
                    "wallet": wallet_info.get('result') if 'result' in wallet_info else None,
                    "balance": balance.get('result') if 'result' in balance else None,
                    "balances": balances_result,
                    "unspent": unspent.get('result') if 'result' in unspent else None,
                    "transactions": transactions.get('result') if 'result' in transactions else None,
                    "loadedWallets": loaded_wallets
                }
            }

            self._wallet_cache = response
            self._wallet_cache_time = now
            self.wfile.write(json.dumps(response, indent=2).encode())

        except Exception as e:
            error_response = {
                "status": "error",
                "message": f"Failed to get wallet data: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response).encode())

    def handle_config_wallet_save(self):
        """POST /api/config/wallet - save wallet_name only (merge into existing config)."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length <= 0:
            self.wfile.write(json.dumps({"ok": False, "error": "Missing body"}).encode())
            return
        try:
            body = self.rfile.read(content_length)
        except Exception:
            self.wfile.write(json.dumps({"ok": False, "error": "Failed to read body"}).encode())
            return
        try:
            data = json.loads(body.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            self.wfile.write(json.dumps({"ok": False, "error": "Invalid JSON"}).encode())
            return
        wallet_name = data.get('wallet_name')
        if wallet_name is not None and not isinstance(wallet_name, str):
            wallet_name = str(wallet_name)
        ok, err = config_service.save_wallet_name(wallet_name)
        if ok:
            self.wfile.write(json.dumps({"ok": True}).encode())
        else:
            self.wfile.write(json.dumps({"ok": False, "error": err}).encode())

    def _get_data_dir(self):
        """Return the path to the data directory (project/data)."""
        return os.path.join(os.path.dirname(_backend_dir), "data")

    def _get_db_path(self):
        """Return the path to the SQLite DB (blocks/network/distribution)."""
        return os.path.join(self._get_data_dir(), "node_monitor.db")

    def _get_host_memory(self):
        """Return host system memory stats (total, used, available, percent, swap). None if unavailable."""
        try:
            import psutil
            vmem = psutil.virtual_memory()
            swap = psutil.swap_memory()
            return {
                "total": vmem.total,
                "available": vmem.available,
                "used": vmem.used,
                "percent": round(vmem.percent, 1),
                "swap_total": swap.total,
                "swap_free": swap.free,
                "swap_used": swap.used,
            }
        except ImportError:
            return None
        except Exception:
            return None

    def _get_host_architecture(self):
        """Return host system architecture (e.g. x86_64, aarch64, armv7l)."""
        try:
            import platform
            return platform.machine()
        except Exception:
            return None

    def _compute_avg_block_time(self, blocks):
        """Compute average block time in seconds from block_time strings."""
        try:
            from datetime import datetime
        except ImportError:
            return None

        times = []
        for block in blocks:
            ts = block.get('block_time')
            if not ts:
                continue
            try:
                dt = datetime.strptime(ts, '%Y-%m-%d %H:%M:%S')
            except (TypeError, ValueError):
                continue
            times.append(dt.timestamp())

        if len(times) < 2:
            return None

        times.sort()
        deltas = []
        for i in range(1, len(times)):
            if times[i] > times[i - 1]:
                deltas.append(times[i] - times[i - 1])

        if not deltas:
            return None

        return sum(deltas) / len(deltas)

    def _get_chain_height(self):
        """Return current chain tip height from RPC, or None if unavailable."""
        if self.rpc_service is None:
            return None
        try:
            info = self.rpc_service.get_blockchain_info()
            result = info.get("result") if isinstance(info.get("result"), dict) else None
            if result is not None and isinstance(result.get("blocks"), int):
                return result["blocks"]
        except Exception:
            pass
        return None

    def _get_seconds_since_last_block(self, blocks_data, now):
        """Return seconds since the most recent block's time, or None."""
        if not blocks_data or not isinstance(blocks_data, list):
            return None
        first = blocks_data[0]
        block_time_str = first.get("block_time") if isinstance(first, dict) else None
        if not block_time_str:
            return None
        try:
            from datetime import datetime, timezone
            # block_time is stored as UTC in '%Y-%m-%d %H:%M:%S'
            block_time = datetime.strptime(block_time_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            delta = now - block_time
            return int(delta.total_seconds()) if delta.total_seconds() >= 0 else None
        except (ValueError, TypeError):
            return None

    def _get_tip_block_from_rpc(self):
        """When DB has no blocks, fetch current tip from RPC so 'time since last block' can be shown."""
        try:
            from datetime import datetime, timezone
            chain_height = self._get_chain_height()
            if chain_height is None:
                return None
            hash_resp = self.rpc_service.get_block_hash(chain_height)
            block_hash = hash_resp.get("result") if isinstance(hash_resp.get("result"), str) else None
            if not block_hash:
                return None
            block_resp = self.rpc_service.get_block(block_hash, 1)
            block = block_resp.get("result") if isinstance(block_resp.get("result"), dict) else None
            if not block or not isinstance(block.get("time"), (int, float)):
                return None
            block_time_str = datetime.fromtimestamp(
                int(block["time"]), tz=timezone.utc
            ).strftime("%Y-%m-%d %H:%M:%S")
            return {
                "block_height": chain_height,
                "block_hash": block.get("hash"),
                "block_time": block_time_str,
                "mining_pool": None,
                "transaction_count": block.get("nTx"),
                "block_size": block.get("size"),
                "block_weight": block.get("weight"),
                "block_reward": None,
                "total_fees": None,
                "total_fees_usd": None,
                "time_since_last_block": "",
            }
        except Exception:
            return None

    def handle_blocks_data(self):
        """Handle blocks data requests from SQLite (with in-memory cache)."""
        try:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            if (self._blocks_cache is not None and self._blocks_cache_time is not None and
                    (now - self._blocks_cache_time).total_seconds() < BLOCKS_CACHE_SECONDS):
                avg_block_time = self._compute_avg_block_time(self._blocks_cache or [])
                chain_height = self._get_chain_height()
                seconds_since = self._get_seconds_since_last_block(self._blocks_cache, now)
                response = {
                    "status": "success",
                    "data": {
                        "blocks": self._blocks_cache,
                        "total_blocks": len(self._blocks_cache),
                        "cached": True,
                        "avg_block_time_seconds": avg_block_time,
                        "chain_height": chain_height,
                        "seconds_since_last_block": seconds_since
                    }
                }
                self.wfile.write(json.dumps(response, indent=2).encode())
                return

            blocks_data = get_recent_blocks(BLOCKS_DISPLAY_LIMIT, self._get_db_path())
            if not blocks_data and self.rpc_service is not None:
                tip_block = self._get_tip_block_from_rpc()
                if tip_block is not None:
                    blocks_data = [tip_block]
            avg_block_time = self._compute_avg_block_time(blocks_data)
            self._blocks_cache = blocks_data
            self._blocks_cache_time = now
            chain_height = self._get_chain_height()
            seconds_since = self._get_seconds_since_last_block(blocks_data, now)

            response = {
                "status": "success",
                "data": {
                    "blocks": blocks_data,
                    "total_blocks": len(blocks_data),
                    "cached": False,
                    "avg_block_time_seconds": avg_block_time,
                    "chain_height": chain_height,
                    "seconds_since_last_block": seconds_since
                }
            }
            self.wfile.write(json.dumps(response, indent=2).encode())

        except Exception as e:
            error_response = {
                "status": "error",
                "message": f"Failed to get blocks data: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response).encode())

    def _get_fee_estimates(self):
        """Return fee estimates in sat/vB for high/medium/low (2, 4, 6 blocks), and optional errors. None if RPC unavailable."""
        if self.rpc_service is None:
            return None, None
        try:
            result = {}
            errors = {}
            for blocks, key in [(2, "high_sat_per_vb"), (4, "medium_sat_per_vb"), (6, "low_sat_per_vb")]:
                resp = self.rpc_service.estimate_smart_fee(blocks)
                res = resp.get("result") if isinstance(resp.get("result"), dict) else None
                feerate = res.get("feerate") if res else None
                res_errors = res.get("errors") if res else None
                if feerate is not None and isinstance(feerate, (int, float)):
                    sat_per_vb = round(float(feerate) * 1e8 / 1000)
                    result[key] = max(0, sat_per_vb)
                    errors[key] = None
                else:
                    result[key] = None
                    if isinstance(res_errors, list) and len(res_errors) > 0:
                        errors[key] = str(res_errors[0])
                    else:
                        errors[key] = "Insufficient data or no feerate found"
            return result, errors
        except Exception:
            return None, None

    def handle_network_data(self):
        """Handle network data requests (hashrate and difficulty history from SQLite, optional fee estimates)."""
        try:
            from constants import DIFFICULTY_JSON_MAX_ENTRIES
            network_data = get_network_history(DIFFICULTY_JSON_MAX_ENTRIES, self._get_db_path())
            data = {
                "network_history": network_data,
                "total_records": len(network_data)
            }
            fee_estimates, fee_estimate_errors = self._get_fee_estimates()
            if fee_estimates is not None:
                data["fee_estimates"] = fee_estimates
            if fee_estimate_errors is not None and any(fee_estimate_errors.get(k) for k in ("high_sat_per_vb", "medium_sat_per_vb", "low_sat_per_vb")):
                data["fee_estimate_errors"] = fee_estimate_errors
            response = {
                "status": "success",
                "data": data
            }
            self.wfile.write(json.dumps(response, indent=2).encode())

        except Exception as e:
            error_response = {
                "status": "error",
                "message": f"Failed to get network data: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response).encode())

    def handle_distribution_data(self):
        """Handle pool distribution data from SQLite."""
        try:
            from datetime import datetime
            now = datetime.now()
            if (self._distribution_cache is not None and self._distribution_cache_time is not None and
                    (now - self._distribution_cache_time).total_seconds() < BLOCKS_CACHE_SECONDS):
                self.wfile.write(json.dumps({
                    "status": "success",
                    "data": self._distribution_cache
                }, indent=2).encode())
                return

            data = get_distribution(self._get_db_path())
            self._distribution_cache = data
            self._distribution_cache_time = now

            self.wfile.write(json.dumps({
                "status": "success",
                "data": data
            }, indent=2).encode())

        except Exception as e:
            error_response = {
                "status": "error",
                "message": f"Failed to get distribution data: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response).encode())

    def _cached_fetch_prices(self):
        """Fetch BTC prices from mempool.space, with in-memory cache (60s TTL)."""
        api = MEMPOOL_SPACE_API_URL
        price_cache_seconds = 60
        from datetime import datetime
        now = datetime.now()
        if (self._price_cache is not None and self._price_cache_time is not None and
                (now - self._price_cache_time).total_seconds() < price_cache_seconds):
            return self._price_cache
        try:
            with urlopen(f'{api}/v1/prices', timeout=10) as resp:
                data = json.loads(resp.read().decode())
            if isinstance(data, dict):
                self._price_cache = data
                self._price_cache_time = now
                return data
        except (URLError, HTTPError, json.JSONDecodeError, OSError):
            pass
        return self._price_cache if self._price_cache is not None else {}

    def handle_price(self):
        """Handle BTC price requests (mempool.space, cached)."""
        try:
            data = self._cached_fetch_prices()
            response = {
                "status": "success",
                "data": data
            }
            self.wfile.write(json.dumps(response, indent=2).encode())
        except Exception as e:
            error_response = {
                "status": "error",
                "message": f"Failed to get price data: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response).encode())

    def _check_connection_error(self, response_data, operation_name=None):
        """Helper method to check for connection errors and send appropriate response"""
        if 'error' in response_data and response_data['error']:
            error_msg = str(response_data['error'])
            if 'Connection' in error_msg or 'timed out' in error_msg or 'failed' in error_msg:
                operation_desc = f" during {operation_name}" if operation_name else ""
                error_response = {
                    "status": "error",
                    "message": f"Bitcoin node is not responding{operation_desc}: {response_data['error']}"
                }
                self.wfile.write(json.dumps(error_response).encode())
                return True
        return False

    def _load_pools_data(self):
        """Load pools data from JSON file"""
        if self._pools_data is None:
            try:
                pools_file = os.path.join(self._get_data_dir(), 'pools.json')
                with open(pools_file, 'r', encoding='utf-8') as f:
                    self._pools_data = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError) as e:
                print(f"Error loading pools data: {e}")
                self._pools_data = {"pools": []}
        return self._pools_data

    def handle_pools_data(self):
        """Handle pools data requests"""
        try:
            data = self._load_pools_data()
            self.wfile.write(json.dumps(data.get('pools', [])).encode())
        except Exception as e:
            error_response = {
                "status": "error",
                "message": f"Failed to get pools data: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response).encode())

    def handle_pools_signatures(self):
        """Handle pools signatures requests"""
        try:
            data = self._load_pools_data()
            signatures = {}
            for pool in data.get('pools', []):
                pool_identifier = pool.get('identifier', pool.get('name', '').lower().replace(' ', '').replace('.', ''))
                for signature in pool.get('signatures', []):
                    signatures[signature] = pool_identifier
            self.wfile.write(json.dumps(signatures).encode())
        except Exception as e:
            error_response = {
                "status": "error",
                "message": f"Failed to get pools signatures: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response).encode())

    def handle_pool_by_name(self, path):
        """Handle pool by name requests"""
        try:
            name = path.split('/')[-1]
            data = self._load_pools_data()
            for pool in data.get('pools', []):
                if pool.get('name', '').lower() == name.lower():
                    self.wfile.write(json.dumps(pool).encode())
                    return
            self.send_error(404, "Pool not found")
        except Exception as e:
            error_response = {
                "status": "error",
                "message": f"Failed to get pool by name: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response).encode())

    def handle_pool_by_signature(self, path):
        """Handle pool by signature requests"""
        try:
            signature = path.split('/')[-1]
            data = self._load_pools_data()
            for pool in data.get('pools', []):
                if signature in pool.get('signatures', []):
                    self.wfile.write(json.dumps(pool).encode())
                    return
            self.send_error(404, "Pool not found")
        except Exception as e:
            error_response = {
                "status": "error",
                "message": f"Failed to get pool by signature: {str(e)}"
            }
            self.wfile.write(json.dumps(error_response).encode())

    def log_message(self, message_format, *args):  # pylint: disable=redefined-builtin,arguments-differ,unused-argument
        """Override to reduce logging noise."""
        pass  # pylint: disable=unnecessary-pass

def start_api_server(port=None):
    """Start the API server and the in-process block monitor thread."""
    if port is None:
        port = API_SERVER_PORT

    data_dir = os.path.join(os.path.dirname(_backend_dir), "data")
    db_path = os.path.join(data_dir, "node_monitor.db")
    os.makedirs(data_dir, exist_ok=True)
    init_schema(db_path)

    # Block monitor uses this API for pool signatures (data/pools.json) when running in-process
    if "POOLS_API_URL" not in os.environ:
        os.environ["POOLS_API_URL"] = f"http://127.0.0.1:{port}"

    try:
        from monitor_node import BlockchainMonitor
        zmq_endpoint = os.environ.get("ZMQ_ENDPOINT", DEFAULT_ZMQ_ENDPOINT)
        monitor = BlockchainMonitor(zmq_endpoint=zmq_endpoint, exit_on_rpc_failure=False)
        monitor_thread = threading.Thread(target=monitor.run_loop, kwargs={"interval": 10}, daemon=True)
        monitor_thread.start()
        print(f"Block monitor started in background (ZMQ_ENDPOINT={zmq_endpoint})")
    except Exception as e:
        print(f"Block monitor not started: {e}")

    try:
        server = HTTPServer(('localhost', port), BitcoinAPIHandler)
        server.serve_forever()

    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {port} is already in use. Please free it up and try again.")
            print(f"   Kill process: sudo lsof -ti:{port} | xargs kill -9")
        else:
            print(f"❌ Error starting API server: {e}")
    except Exception as e:
        print(f"❌ Error starting API server: {e}")

if __name__ == "__main__":
    start_api_server()
