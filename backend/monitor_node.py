#!/usr/bin/env python3
"""
Bitcoin Blockchain Monitor
Real-time monitoring of Bitcoin blockchain activity
"""

import logging
import time
import json
import sys
import os
import base64
import signal
import traceback
import sqlite3
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import requests

_log = logging.getLogger(__name__)

try:
    import zmq
    ZMQ_AVAILABLE = True
except ImportError:
    ZMQ_AVAILABLE = False

from rpc_service import create_rpc_connection
from price_service import get_bitcoin_price
from constants import API_SERVER_URL, BLOCKS_DB_MAX_ENTRIES, DEFAULT_ZMQ_ENDPOINT
from error_service import error_service
try:
    from block_store import (
        init_schema,
        insert_block,
        insert_network_snapshot,
        get_last_logged_block_height,
        prune_blocks_if_over,
        update_avg_block_time,
    )
    BLOCK_STORE_AVAILABLE = True
except ImportError:
    BLOCK_STORE_AVAILABLE = False

class BlockchainMonitor:
    """Monitor Bitcoin blockchain activity and new blocks with ZMQ and polling support."""

    def __init__(self, zmq_endpoint: str = DEFAULT_ZMQ_ENDPOINT, exit_on_rpc_failure: bool = True):
        """Initialize the monitor with RPC connection.
        If exit_on_rpc_failure is True (standalone), exit process when RPC is unavailable.
        If False (embedded e.g. in API), leave rpc_service None and run_loop will no-op until RPC is up."""
        self.zmq_endpoint = zmq_endpoint
        self.rpc_service = create_rpc_connection()
        if not self.rpc_service:
            print("❌ Failed to create RPC connection")
            print("   Make sure Bitcoin node is running and configured properly")
            if exit_on_rpc_failure:
                sys.exit(1)

        self.last_block_height = 0
        self.last_mempool_size = 0
        self.last_block_time = None
        self.running = False
        self.zmq_context = None
        self.zmq_socket = None

        # Block processing cache to avoid duplicate RPC calls
        self._block_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_max_age = 300  # 5 minutes cache for block data

        # Track the last block height we wrote to prevent duplicates
        self._last_logged_block_height: int = 0

        # Network data tracking
        self._last_hashrate: Optional[float] = None
        self._last_difficulty: Optional[float] = None
        self._network_data_cache: Dict[str, Any] = {}
        self._network_cache_max_age = 60  # 1 minute cache for network data
        self._last_network_log_time: Optional[datetime] = None
        self._network_log_interval = 300  # Log network data every 5 minutes

        # Statistics
        self.blocks_received = 0
        self.start_time = None
        self.monitoring_mode = "unknown"

        self._db_path = os.path.join(self._get_data_dir(), "node_monitor.db")
        if BLOCK_STORE_AVAILABLE:
            init_schema(self._db_path)
            self._last_logged_block_height = get_last_logged_block_height(self._db_path)
            if self._last_logged_block_height > 0:
                print(f"Loaded last logged block height: {self._last_logged_block_height}")
            print(f"Block monitor DB path: {self._db_path}")
        else:
            print("Block store unavailable; blocks will not be persisted")

    def _get_data_dir(self) -> str:
        """Return the absolute path to the data directory."""
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(os.path.dirname(script_dir), "data")
        return os.path.abspath(data_dir)

    def get_blockchain_info(self) -> Optional[Dict[str, Any]]:
        """Get current blockchain information"""
        result = self.rpc_service.get_blockchain_info()
        return result.get('result') if 'result' in result else None

    def get_mempool_info(self) -> Optional[Dict[str, Any]]:
        """Get current mempool information"""
        result = self.rpc_service.get_mempool_info()
        return result.get('result') if 'result' in result else None

    def get_network_info(self) -> Optional[Dict[str, Any]]:
        """Get current network information"""
        result = self.rpc_service.get_network_info()
        return result.get('result') if 'result' in result else None

    def get_bitcoin_price(self) -> Optional[float]:
        """Get current Bitcoin price in USD"""
        return get_bitcoin_price()

    def get_network_hashrate(self) -> Optional[float]:
        """Get current network hashrate in TH/s"""
        try:
            result = self.rpc_service.rpc_call('getnetworkhashps', [120])  # 120 blocks average
            if 'result' in result:
                hashrate_hs = result['result']
                # Bitcoin Core can return null when not enough block data (e.g. during sync)
                if hashrate_hs is not None and isinstance(hashrate_hs, (int, float)):
                    hashrate_ths = hashrate_hs / (10**12)
                    return hashrate_ths
        except Exception as e:
            print(f"Error getting network hashrate: {e}")
        return None

    def get_network_difficulty(self) -> Optional[float]:
        """Get current network difficulty"""
        try:
            blockchain_info = self.get_blockchain_info()
            if blockchain_info:
                return blockchain_info.get('difficulty')
        except Exception as e:
            print(f"Error getting network difficulty: {e}")
        return None

    def setup_zmq(self) -> bool:
        """Setup ZeroMQ connection for block notifications."""
        if not ZMQ_AVAILABLE:
            return False

        try:
            self.zmq_context = zmq.Context()
            self.zmq_socket = self.zmq_context.socket(zmq.SUB)

            # Connect to Bitcoin Core's ZMQ publisher
            self.zmq_socket.connect(self.zmq_endpoint)

            # Subscribe to block hash notifications
            self.zmq_socket.setsockopt(zmq.SUBSCRIBE, b"hashblock")

            # Set socket timeout for non-blocking operation
            self.zmq_socket.setsockopt(zmq.RCVTIMEO, 1000)  # 1 second timeout

            _log.info("ZMQ connected endpoint=%s subscribed=hashblock", self.zmq_endpoint)
            return True

        except Exception as e:
            _log.warning("ZMQ setup failed endpoint=%s: %s", self.zmq_endpoint, e)
            return False

    def display_header(self) -> None:
        """Display monitoring header (no-op when running in background)."""


    def display_blockchain_status(self, blockchain_info):
        """Display current blockchain status (no-op; status is served via API)."""
        if not blockchain_info:
            pass

    def display_mempool_status(self, mempool_info):
        """Display current mempool status (no-op; status is served via API)."""
        if not mempool_info:
            pass


    def listen_for_blocks_zmq(self) -> None:
        """Listen for ZMQ block notifications"""
        if not self.zmq_socket:
            return

        self.running = True
        self.start_time = datetime.now()
        self.monitoring_mode = "ZMQ"

        while self.running:
            try:
                # Try to receive ZMQ multipart message with timeout
                message_parts = self.zmq_socket.recv_multipart(zmq.NOBLOCK)

                if message_parts and len(message_parts) >= 2:
                    # Bitcoin Core ZMQ sends multipart messages: [topic, data]
                    topic = message_parts[0]
                    data = message_parts[1]

                    if topic == b'hashblock':
                        # New block hash received
                        block_hash = data.hex()
                        _log.info("ZMQ hashblock received hash=%s", block_hash)
                        self._process_new_block_hash_zmq(block_hash)

            except zmq.Again:
                # No message received (timeout)
                pass
            except KeyboardInterrupt:
                self.running = False
                break
            except Exception:
                time.sleep(1)
            self.check_and_log_network_data()

    def _process_new_block_hash_zmq(self, block_hash: str) -> None:
        """Process a new block hash received via ZMQ"""
        try:
            block_result = self.rpc_service.rpc_call('getblock', [block_hash])
            if 'result' not in block_result:
                return

            block = block_result['result']
            if block is None:
                return
            current_height = block.get('height', 0)

            if current_height <= self.last_block_height:
                _log.debug(
                    "ZMQ block skipped (height not new) current_height=%s last_block_height=%s",
                    current_height,
                    self.last_block_height,
                )
                return

            _log.info("ZMQ block accepted height=%s hash=%s", current_height, block_hash)
            self.blocks_received += 1
            self._process_new_block(block, current_height)

        except Exception as e:
            print(f"Block processing error: {type(e).__name__}: {e}")
            print(traceback.format_exc())

    def check_for_new_block(self, blockchain_info):
        """Check if a new block was found"""
        if not blockchain_info:
            return False

        current_height = blockchain_info.get('blocks', 0)

        if current_height <= self.last_block_height or self.last_block_height <= 0:
            if self.last_block_height <= 0:
                _log.debug("polling first run or no change height=%s", current_height)
            self.last_block_height = current_height
            return False

        _log.info("polling new block detected height=%s", current_height)
        return self._process_new_block(blockchain_info, current_height)

    def _process_new_block(self, block_or_info, current_height):
        """Process a new block that was found"""
        try:
            # Handle both ZMQ (block object) and polling (blockchain_info) inputs
            if isinstance(block_or_info, dict) and 'hash' in block_or_info:
                # This is a block object from ZMQ
                block = block_or_info
                block_hash = block.get('hash')
            else:
                # This is blockchain_info from polling
                blockchain_info = block_or_info
                block_hash = blockchain_info.get('bestblockhash')

                cache_key = f"block_{block_hash}"
                if cache_key in self._block_cache:
                    cached_data = self._block_cache[cache_key]
                    if time.time() - cached_data.get('timestamp', 0) < self._cache_max_age:
                        block = cached_data['data']
                    else:
                        del self._block_cache[cache_key]
                        block = None
                else:
                    block = None

                if block is None:
                    block_result = self.rpc_service.rpc_call('getblock', [block_hash])
                    if 'result' not in block_result:
                        return self._handle_block_error()
                    block = block_result['result']
                    if block is None:
                        return self._handle_block_error()
                    self._block_cache[cache_key] = {
                        'data': block,
                        'timestamp': time.time()
                    }

            current_block_time = datetime.fromtimestamp(block.get('time', 0))
            mining_pool = self._extract_mining_pool(block)
            time_since_last_block = self._get_time_since_last_block(current_block_time)
            self._calculate_and_log_fees(block, mining_pool, time_since_last_block)

            self.last_block_height = current_height
            self.last_block_time = current_block_time
            return True

        except (requests.RequestException, KeyError, ValueError) as e:
            error_service.handle_critical_error("Block processing", e)
            return False

    def _handle_block_error(self):
        """Handle error when getting block details"""
        return False

    def _extract_mining_pool(self, block):
        """Extract mining pool information (no output)."""
        try:
            mining_pool = self.extract_mining_pool_info(block)
            return mining_pool if mining_pool else "Unknown"
        except (requests.RequestException, KeyError, ValueError):
            return "Unknown"

    def _calculate_and_log_fees(self, block, mining_pool, time_since_last_block):
        """Calculate block fees and log to store (no output)."""
        block_details = None
        try:
            block_details = self.calculate_block_btc(block)
        except (requests.RequestException, KeyError, ValueError):
            error_service.handle_api_error("Block fees calculation", None)
        self._persist_block(block, mining_pool, block_details, time_since_last_block)
        # Always update in-memory chain tip when we process a new block (so frontend gets notifications even if DB is disabled)
        try:
            from chain_tip_state import set_chain_tip
            block_height = block.get('height', 0)
            set_chain_tip(
                height=block_height,
                block_hash=block.get('hash'),
                mining_pool=mining_pool,
                transaction_count=len(block.get('tx', [])),
            )
            _log.info("chain tip updated for height=%s", block_height)
        except Exception as e:
            _log.debug("set_chain_tip failed: %s", e)

    def _get_time_since_last_block(self, current_block_time):
        """Return formatted time since last block (no output)."""
        if self.last_block_time is None:
            return "First block"
        time_diff = current_block_time - self.last_block_time
        total_seconds = int(time_diff.total_seconds())
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        return f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"

    def extract_mining_pool_info(self, block):
        """Extract mining pool information from coinbase transaction"""
        try:
            coinbase_txid = self._get_coinbase_txid(block)
            if not coinbase_txid:
                return None

            tx = self._get_transaction_details(coinbase_txid, block.get('hash'))
            if not tx:
                return None

            coinbase_hex = self._extract_coinbase_hex(tx)
            if not coinbase_hex:
                return "Solo Miner / Unknown"

            return self._analyze_coinbase_data(coinbase_hex)

        except (requests.RequestException, KeyError, ValueError) as e:
            error_service.handle_api_error("Mining pool extraction", e)
            return None

    def _get_coinbase_txid(self, block):
        """Get the coinbase transaction ID from block"""
        if 'tx' not in block or len(block['tx']) == 0:
            return None
        return block['tx'][0]

    def _get_transaction_details(self, coinbase_txid, block_hash=None):
        """Get transaction details from RPC call. Pass block_hash to fetch from block (not mempool)."""
        params = [coinbase_txid, True]
        if block_hash:
            params.append(block_hash)
        tx_result = self.rpc_service.rpc_call('getrawtransaction', params)
        if 'result' not in tx_result:
            return None
        return tx_result['result']

    def _extract_coinbase_hex(self, tx):
        """Extract coinbase hex from transaction"""
        if 'vin' not in tx or len(tx['vin']) == 0:
            return None

        coinbase_input = tx['vin'][0]
        return coinbase_input.get('coinbase')

    def _analyze_coinbase_data(self, coinbase_hex):
        """Analyze coinbase data to determine mining pool"""
        try:
            coinbase_bytes = bytes.fromhex(coinbase_hex)
            return self._check_known_pools(coinbase_bytes, coinbase_hex)
        except ValueError:
            return "Solo Miner / Unknown"

    def _check_known_pools(self, coinbase_bytes, coinbase_hex):
        """Check for known mining pool signatures"""
        mining_pools = self._get_mining_pool_signatures()

        for signature, pool_name in mining_pools.items():
            if signature.lower() in coinbase_bytes.lower():
                return pool_name

        slash_pool = self._check_slash_format(coinbase_bytes)
        if slash_pool:
            return slash_pool

        if len(coinbase_hex) > 20:
            return f"Unknown Pool ({coinbase_hex[:20]}...)"

        return "Solo Miner / Unknown"

    def _get_mining_pool_signatures(self):
        """Get dictionary of mining pool signatures from API"""
        try:
            api_url = os.getenv('POOLS_API_URL', API_SERVER_URL)
            response = requests.get(f"{api_url}/api/pools/signatures", timeout=5)

            if response.status_code == 200:
                signatures_dict = response.json()
                # Convert string keys to bytes for compatibility
                signatures = {k.encode('utf-8'): v for k, v in signatures_dict.items()}
                return signatures
            return {}

        except (requests.RequestException, KeyError, ValueError):
            return {}

    def _check_slash_format(self, coinbase_bytes):
        """Check for slash-separated pool format"""
        if b'/' not in coinbase_bytes:
            return None

        try:
            text_part = coinbase_bytes.split(b'/')[1].decode('utf-8', errors='ignore').strip()
            if text_part and len(text_part) > 2:
                return text_part
        except (UnicodeDecodeError, ValueError):
            pass
        return None

    def calculate_block_btc(self, block):
        """Calculate total BTC in block (block reward + transaction fees)"""
        try:
            if not block.get('tx') or len(block['tx']) == 0:
                return None

            coinbase_txid = block['tx'][0]
            block_hash = block.get('hash')
            if not block_hash:
                return None
            tx_result = self.rpc_service.rpc_call(
                'getrawtransaction', [coinbase_txid, True, block_hash]
            )

            if 'result' not in tx_result:
                return None

            coinbase_tx = tx_result['result']
            if coinbase_tx is None:
                return None
            block_reward = sum(out.get('value', 0) for out in coinbase_tx.get('vout', []))

            # Calculate block subsidy based on block height
            # Block subsidy halves every 210,000 blocks
            block_height = block.get('height', 0)
            halvings = block_height // 210000
            block_subsidy = 50.0 / (2 ** halvings)

            # Total fees = Total coinbase output - Block subsidy
            # The coinbase transaction includes both the subsidy and all transaction fees
            total_fees = block_reward - block_subsidy

            return (block_reward, total_fees)

        except (requests.RequestException, KeyError, ValueError) as e:
            error_service.handle_api_error("Block BTC calculation", e)
            return None

    def extract_op_return_data(self, block):
        """Extract OP_RETURN data from block transactions with enhanced decoding"""
        try:
            op_return_data = []
            tx_list = block.get('tx', [])

            # Limit to first 20 transactions to prevent blocking
            max_tx_to_check = min(20, len(tx_list))

            for txid in tx_list[:max_tx_to_check]:
                tx_data = self._process_transaction_for_op_return(txid)
                if tx_data:
                    op_return_data.extend(tx_data)

            return op_return_data

        except (requests.RequestException, KeyError, ValueError) as e:
            error_service.handle_api_error("OP_RETURN data extraction", e)
            return []

    def _process_transaction_for_op_return(self, txid):
        """Process a single transaction for OP_RETURN data"""
        try:
            tx_result = self.rpc_service.rpc_call('getrawtransaction', [txid, True])
            if 'result' not in tx_result:
                return []

            tx = tx_result['result']
            return self._extract_op_return_from_tx(tx)

        except (requests.RequestException, KeyError, ValueError):
            return []

    def _extract_op_return_from_tx(self, tx):
        """Extract OP_RETURN data from a transaction"""
        op_return_data = []

        for vout in tx.get('vout', []):
            script_pub_key = vout.get('scriptPubKey', {})
            asm = script_pub_key.get('asm', '')

            if asm.startswith('OP_RETURN'):
                parts = asm.split(' ', 1)
                if len(parts) > 1:
                    hex_data = parts[1]
                    decoded_info = self._decode_op_return_data(hex_data)
                    if decoded_info:
                        op_return_data.append(decoded_info)

        return op_return_data

    def _decode_op_return_data(self, hex_data: str) -> str:
        """Enhanced OP_RETURN data decoding with multiple format support and early returns"""
        try:
            data_bytes = bytes.fromhex(hex_data)
            decoded_results = []

            # Try most common formats first (early returns for performance)
            if self._try_text_decoding(data_bytes, decoded_results):
                return " | ".join(decoded_results)

            if self._try_base64_decoding(data_bytes, decoded_results):
                return " | ".join(decoded_results)

            if self._try_json_decoding(data_bytes, decoded_results):
                return " | ".join(decoded_results)

            self._try_url_decoding(data_bytes, decoded_results)
            self._try_address_decoding(data_bytes, decoded_results)
            self._try_timestamp_decoding(data_bytes, decoded_results)
            self._try_numeric_decoding(data_bytes, decoded_results)

            if decoded_results:
                return " | ".join(decoded_results)
            return f"Hex: {hex_data}"

        except (UnicodeDecodeError, ValueError, OverflowError) as e:
            return f"Error: {str(e)[:50]}"

    def _try_text_decoding(self, data_bytes: bytes, decoded_results: List[str]) -> bool:
        """Try UTF-8 and ASCII text decoding. Returns True if successful."""
        for encoding, label in [('utf-8', 'Text'), ('ascii', 'ASCII')]:
            try:
                text = data_bytes.decode(encoding, errors='ignore')
                if text.isprintable() and len(text.strip()) > 0:
                    decoded_results.append(f"{label}: {text}")
                    return True  # Early return on first successful decode
            except (UnicodeDecodeError, ValueError):
                pass
        return False

    def _try_base64_decoding(self, data_bytes: bytes, decoded_results: List[str]) -> bool:
        """Try Base64 decoding. Returns True if successful."""
        try:
            if (len(data_bytes) % 4 == 0 and
                all(c in b'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=' for c in data_bytes)):
                base64_decoded = base64.b64decode(data_bytes)
                base64_text = base64_decoded.decode('utf-8', errors='ignore')
                if base64_text.isprintable() and len(base64_text.strip()) > 0:
                    decoded_results.append(f"Base64: {base64_text}")
                    return True
        except (UnicodeDecodeError, ValueError):
            pass
        return False

    def _try_json_decoding(self, data_bytes: bytes, decoded_results: List[str]) -> bool:
        """Try JSON decoding. Returns True if successful."""
        try:
            json_text = data_bytes.decode('utf-8', errors='ignore')
            json.loads(json_text)  # Test if it's valid JSON
            decoded_results.append(f"JSON: {json_text}")
            return True
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            pass
        return False

    def _try_url_decoding(self, data_bytes, decoded_results):
        """Try URL detection"""
        try:
            url_text = data_bytes.decode('utf-8', errors='ignore')
            if url_text.startswith(('http://', 'https://', 'ftp://')):
                decoded_results.append(f"URL: {url_text}")
        except (UnicodeDecodeError, ValueError):
            pass

    def _try_address_decoding(self, data_bytes, decoded_results):
        """Try Bitcoin address detection"""
        try:
            addr_text = data_bytes.decode('utf-8', errors='ignore')
            if (addr_text.startswith(('1', '3', 'bc1')) and
                len(addr_text) in [26, 35, 42, 62]):
                decoded_results.append(f"Address: {addr_text}")
        except (UnicodeDecodeError, ValueError):
            pass

    def _try_timestamp_decoding(self, data_bytes, decoded_results):
        """Try timestamp decoding"""
        try:
            if len(data_bytes) == 4:  # 4 bytes = 32-bit timestamp
                timestamp = int.from_bytes(data_bytes, byteorder='big')
                if 1000000000 < timestamp < 2000000000:  # Reasonable timestamp range
                    dt = datetime.fromtimestamp(timestamp)
                    decoded_results.append(f"Timestamp: {dt.strftime('%Y-%m-%d %H:%M:%S')}")
        except (ValueError, OSError):
            pass

    def _try_numeric_decoding(self, data_bytes, decoded_results):
        """Try numeric data decoding"""
        try:
            if len(data_bytes) <= 8:  # Up to 64-bit numbers
                number = int.from_bytes(data_bytes, byteorder='big')
                if number > 0:
                    decoded_results.append(f"Number: {number}")
        except (ValueError, OverflowError):
            pass

    def _sanitize_mining_pool_name(self, pool_name: str) -> str:
        """Sanitize mining pool name to remove problematic characters"""
        if not pool_name:
            return 'Unknown'

        # Sanitize pool name for display and storage
        sanitized = ''.join(
            c for c in pool_name
            if c.isprintable() and (c.isalnum() or c in ' .-_/()[]{}:')
        )
        sanitized = ' '.join(sanitized.split())
        if len(sanitized) > 50:
            sanitized = sanitized[:50].strip()

        if not sanitized or sanitized.isspace():
            return 'Unknown'

        return sanitized

    def _prepare_block_dict(self, block, mining_pool, block_details, time_since_last_block):
        """Prepare block data as a dict for JSON (numeric types for API/frontend)."""
        block_reward, total_fees = block_details if block_details else (0.0, 0.0)
        btc_price = self.get_bitcoin_price()
        total_fees_usd = total_fees * btc_price if btc_price else 0.0
        sanitized_pool = self._sanitize_mining_pool_name(mining_pool)
        return {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'block_height': block.get('height', 0),
            'block_hash': block.get('hash', 'N/A'),
            'mining_pool': sanitized_pool,
            'transaction_count': len(block.get('tx', [])),
            'block_size': block.get('size', 0),
            'block_weight': block.get('weight', 0),
            'block_reward': round(block_reward, 8),
            'total_fees': round(total_fees, 8),
            'total_fees_usd': round(total_fees_usd, 2),
            'block_time': datetime.fromtimestamp(block.get('time', 0), tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S'),
            'time_since_last_block': time_since_last_block
        }

    def _persist_block(self, block, mining_pool, block_details, time_since_last_block):
        """Persist block to SQLite (block_store)."""
        if not BLOCK_STORE_AVAILABLE:
            _log.debug("_persist_block skipped BLOCK_STORE_AVAILABLE=False")
            return
        block_height = block.get('height', 0)
        if block_height <= self._last_logged_block_height:
            _log.debug(
                "_persist_block skipped duplicate height=%s _last_logged=%s",
                block_height,
                self._last_logged_block_height,
            )
            return
        try:
            block_dict = self._prepare_block_dict(
                block, mining_pool, block_details, time_since_last_block
            )
            insert_block(
                block_height=block_dict['block_height'],
                block_hash=block_dict['block_hash'],
                mining_pool=block_dict['mining_pool'],
                transaction_count=block_dict['transaction_count'],
                block_size=block_dict['block_size'],
                block_weight=block_dict['block_weight'],
                block_reward=block_dict['block_reward'],
                total_fees=block_dict['total_fees'],
                total_fees_usd=block_dict['total_fees_usd'],
                block_time=block_dict['block_time'],
                time_since_last_block=block_dict.get('time_since_last_block', ''),
                db_path=self._db_path,
            )
            self._last_logged_block_height = block_height
            prune_blocks_if_over(BLOCKS_DB_MAX_ENTRIES, self._db_path)
            update_avg_block_time(BLOCKS_DB_MAX_ENTRIES, self._db_path)
            _log.info("block persisted height=%s hash=%s", block_height, block_dict.get("block_hash"))
        except (OSError, IOError, KeyError, ValueError, sqlite3.Error) as e:
            error_service.handle_file_error("block_store", "write", e)

    def _persist_network_snapshot(self, hashrate: Optional[float], difficulty: Optional[float]) -> None:
        """Append one difficulty/hashrate record to SQLite (block_store)."""
        if not BLOCK_STORE_AVAILABLE:
            return
        try:
            blockchain_info = self.get_blockchain_info()
            block_height = blockchain_info.get('blocks', 0) if blockchain_info else 0
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            hr = round(hashrate, 2) if hashrate is not None else None
            diff = round(difficulty, 2) if difficulty is not None else None
            insert_network_snapshot(
                timestamp=timestamp,
                block_height=block_height,
                hash_rate=hr,
                difficulty=diff,
                db_path=self._db_path,
            )
        except (OSError, IOError, KeyError, ValueError, sqlite3.Error) as e:
            error_service.handle_file_error("block_store", "write", e)

    def check_mempool_changes(self, mempool_info):
        """Check for significant mempool changes"""
        if not mempool_info:
            return

        current_size = mempool_info.get('size', 0)

        self.last_mempool_size = current_size

    def check_and_log_network_data(self):
        """Check and log network data if enough time has passed"""
        current_time = datetime.now()

        if (self._last_network_log_time is None or
            (current_time - self._last_network_log_time).total_seconds() >= self._network_log_interval):

            hashrate = self.get_network_hashrate()
            difficulty = self.get_network_difficulty()

            # Persist to SQLite (block_store) if we have valid data
            if hashrate is not None or difficulty is not None:
                self._persist_network_snapshot(hashrate, difficulty)
                self._last_network_log_time = current_time

                if hashrate is not None:
                    self._last_hashrate = hashrate
                if difficulty is not None:
                    self._last_difficulty = difficulty

    def run_loop(self, interval=10):
        """Run the block monitoring loop (ZMQ or polling) until self.running is False.
        Safe to call from a background thread; does not install signal handlers or sys.exit."""
        if not self.rpc_service:
            return
        self.running = True
        self.start_time = datetime.now()

        if self.setup_zmq():
            self.monitoring_mode = "ZMQ"
            print("Block monitor mode: ZMQ")
            self.display_header()
            try:
                self.listen_for_blocks_zmq()
            finally:
                self.cleanup_zmq()
            return

        self.monitoring_mode = "Polling"
        print("Block monitor mode: Polling")
        self.display_header()
        try:
            while self.running:
                blockchain_info = self.get_blockchain_info()
                mempool_info = self.get_mempool_info()
                new_block = self.check_for_new_block(blockchain_info)
                if not new_block:
                    self.check_mempool_changes(mempool_info)
                self.check_and_log_network_data()
                time.sleep(interval)
        except (requests.RequestException, KeyError, ValueError) as e:
            error_service.handle_critical_error("Blockchain monitoring", e)

    def monitor_continuous(self, interval=10):
        """Monitor blockchain continuously (standalone). Use run_loop() when embedded (e.g. in API)."""

        def signal_handler(sig, frame):  # pylint: disable=unused-argument
            self.running = False
            self.cleanup_zmq()
            sys.exit(0)

        signal.signal(signal.SIGINT, signal_handler)
        try:
            self.run_loop(interval)
        finally:
            self.cleanup_zmq()

    def cleanup_zmq(self):
        """Cleanup ZMQ resources"""
        if self.zmq_socket:
            self.zmq_socket.close()
        if self.zmq_context:
            self.zmq_context.term()

    def show_current_status(self):
        """Show current blockchain status once (no-op; status is served via API)."""

def main():
    """Main function with command line argument handling"""
    import argparse

    parser = argparse.ArgumentParser(description='Bitcoin Blockchain Monitor with ZMQ support')
    parser.add_argument('--zmq-endpoint', default=DEFAULT_ZMQ_ENDPOINT,
                       help=f'ZMQ endpoint for block notifications (default: {DEFAULT_ZMQ_ENDPOINT})')
    parser.add_argument('--interval', '-i', type=int, default=10, metavar='SECS',
                       help='Polling interval in seconds when running continuously (default: 10)')
    parser.add_argument('--status', '-s', action='store_true',
                       help='Show current status once and exit')

    args = parser.parse_args()

    monitor = BlockchainMonitor(args.zmq_endpoint)

    if args.status:
        monitor.show_current_status()
    else:
        monitor.display_header()
        monitor.monitor_continuous(args.interval)

if __name__ == "__main__":
    main()
