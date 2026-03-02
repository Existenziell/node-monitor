#!/usr/bin/env python3
"""
Bitcoin Blockchain Monitor
Real-time monitoring of Bitcoin blockchain activity
"""

import time
import json
import sys
import os
import base64
import platform
import signal
import fcntl
from datetime import datetime
from typing import Dict, Any, Optional, List
import requests

try:
    import zmq
    ZMQ_AVAILABLE = True
except ImportError:
    ZMQ_AVAILABLE = False

from rpc_service import create_rpc_connection
from price_service import get_bitcoin_price
from error_service import error_service
from constants import (
    BLOCKS_JSON_MAX_ENTRIES,
    DEFAULT_BLOCKS_JSON,
    DEFAULT_DIFFICULTY_JSON,
    DEFAULT_DISTRIBUTION_JSON,
    DIFFICULTY_JSON_MAX_ENTRIES,
)

class BlockchainMonitor:
    """Monitor Bitcoin blockchain activity and new blocks with ZMQ and polling support."""

    def __init__(self, zmq_endpoint: str = "tcp://127.0.0.1:28332"):
        """Initialize the monitor with RPC connection."""
        self.zmq_endpoint = zmq_endpoint
        self.rpc_service = create_rpc_connection()
        if not self.rpc_service:
            print("❌ Failed to create RPC connection")
            print("   Make sure Bitcoin node is running and configured properly")
            sys.exit(1)

        self.last_block_height = 0
        self.last_mempool_size = 0
        self.last_block_time = None
        self.sound_enabled = True
        self.sound_volume = 0.6
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

        # Initialize last block time and logged height from blocks.json if available
        self._initialize_from_blocks_json()

    def _get_data_dir(self) -> str:
        """Return the absolute path to the data directory."""
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(os.path.dirname(script_dir), "data")
        return os.path.abspath(data_dir)

    def _initialize_from_blocks_json(self) -> None:
        """Initialize last block time and last logged height from blocks.json if available."""
        try:
            data_dir = self._get_data_dir()
            json_file = os.path.join(data_dir, os.path.basename(DEFAULT_BLOCKS_JSON))
            if not os.path.isfile(json_file):
                return
            with open(json_file, 'r', encoding='utf-8') as f:
                content = f.read().replace('\x00', '')
                data = json.loads(content)
            blocks = data.get('blocks') or []
            if not blocks:
                return
            last_block = blocks[-1]
            height = last_block.get('block_height', 0)
            self._last_logged_block_height = int(height)
            block_time_str = last_block.get('block_time')
            if block_time_str and block_time_str != 'N/A':
                try:
                    self.last_block_time = datetime.strptime(
                        block_time_str, '%Y-%m-%d %H:%M:%S'
                    )
                except ValueError as e:
                    print(f"Could not parse last block time from JSON: {e}")
            print(f"Loaded last logged block height: {self._last_logged_block_height}")
        except (OSError, IOError, ValueError, json.JSONDecodeError):
            pass

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
                # Convert from H/s to TH/s
                hashrate_hs = result['result']
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

            print("Connected to ZMQ endpoint: " + self.zmq_endpoint)
            return True

        except Exception as e:
            print(f"❌ Failed to setup ZMQ connection: {e}")
            return False

    def play_block_sound(self) -> None:
        """Play a sound notification when a new block is found"""
        if not self.sound_enabled:
            return

        try:
            system = platform.system()
            # Check for custom sound files first
            custom_sound_path = self._find_custom_sound()
            if custom_sound_path:
                self._play_custom_sound(custom_sound_path, system, volume=self.sound_volume)
                return

            # Fallback to system sounds
            if system == "Darwin":  # macOS
                # Use afplay to play a system sound
                os.system("afplay /System/Library/Sounds/Glass.aiff")
            elif system == "Windows":
                # Use winsound for Windows
                try:
                    import winsound
                    winsound.PlaySound("SystemExclamation", winsound.SND_ALIAS)
                except ImportError:
                    print("\a", end="", flush=True)
            elif system == "Linux":
                # Use paplay for Linux (PulseAudio)
                os.system("paplay /usr/share/sounds/alsa/Front_Left.wav 2>/dev/null || echo -e '\a'")
            else:
                # Fallback: use terminal bell
                print("\a", end="", flush=True)

        except Exception as e:
            # If sound fails, just print a message
            print(f"🔊 Sound notification (error: {e})")

    def _find_custom_sound(self) -> Optional[str]:
        """Find custom sound files in the data/sounds directory"""
        sounds_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "sounds")
        if not os.path.exists(sounds_dir):
            return None
        # Look for audio files in order of preference
        audio_extensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aiff', '.aac']
        for ext in audio_extensions:
            for file in os.listdir(sounds_dir):
                if file.lower().endswith(ext):
                    return os.path.join(sounds_dir, file)
        return None

    def _play_custom_sound(self, sound_path: str, system: str, volume: float = 0.6) -> None:
        """Play a custom sound file with volume control"""
        try:
            if system == "Darwin":  # macOS
                # afplay supports MP3, WAV, AIFF, M4A, AAC with volume control
                os.system(f"afplay -v {volume} '{sound_path}'")
            elif system == "Windows":
                # Use winsound for WAV files, or try to use system default player
                if sound_path.lower().endswith('.wav'):
                    try:
                        import winsound
                        winsound.PlaySound(sound_path, winsound.SND_FILENAME)
                    except ImportError:
                        os.system(f'start "" "{sound_path}"')
                else:
                    # Use system default player for other formats
                    os.system(f'start "" "{sound_path}"')
            elif system == "Linux":
                # Try different players in order of preference with volume control
                players = ['paplay', 'aplay', 'mpg123', 'mpv', 'vlc']
                for player in players:
                    if os.system(f"which {player} >/dev/null 2>&1") == 0:
                        if player == 'paplay':
                            # paplay supports volume control
                            os.system(f"paplay --volume={int(volume * 65536)} '{sound_path}' 2>/dev/null")
                        elif player == 'aplay':
                            # aplay doesn't have direct volume control, but we can use amixer
                            os.system(f"aplay '{sound_path}' 2>/dev/null")
                        elif player == 'mpg123':
                            os.system(f"mpg123 -g {int(volume * 100)} '{sound_path}' 2>/dev/null")
                        elif player == 'mpv':
                            os.system(f"mpv --volume={int(volume * 100)} '{sound_path}' --no-video 2>/dev/null")
                        elif player == 'vlc':
                            os.system(f"vlc --intf dummy --play-and-exit --volume={int(volume * 100)} '{sound_path}' 2>/dev/null")
                        return
                # Fallback to terminal bell
                print("\a", end="", flush=True)
            else:
                # Fallback: use terminal bell
                print("\a", end="", flush=True)
        except Exception as e:
            print(f"🔊 Custom sound notification (error: {e})")

    def toggle_sound(self) -> bool:
        """Toggle sound notifications on/off"""
        self.sound_enabled = not self.sound_enabled
        status = "ON" if self.sound_enabled else "OFF"
        print(f"Sound notifications: {status}")
        return self.sound_enabled

    def set_volume(self, volume: float) -> None:
        """Set sound volume (0.0 to 1.0)"""
        self.sound_volume = max(0.0, min(1.0, volume))

    def display_header(self) -> None:
        """Display monitoring header"""
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Monitoring mode: {self.monitoring_mode}")
        sound_status = "ON" if self.sound_enabled else "OFF"
        print(f"Sound notifications: {sound_status}")
        print()


    def display_blockchain_status(self, blockchain_info):
        """Display current blockchain status"""
        if not blockchain_info:
            return

        print("📊 BLOCKCHAIN STATUS:")
        print(f"  Current Block: {blockchain_info.get('blocks', 'N/A'):,}")
        print(f"  Block Hash: {blockchain_info.get('bestblockhash', 'N/A')}")
        print(f"  Difficulty: {blockchain_info.get('difficulty', 0):,.2f}")
        print(f"  Chain: {blockchain_info.get('chain', 'N/A')}")
        print(f"  Sync Progress: {blockchain_info.get('verificationprogress', 0):.1%}")
        print()

    def display_mempool_status(self, mempool_info):
        """Display current mempool status"""
        if not mempool_info:
            return

        print("🏊 MEMPOOL STATUS:")
        print(f"  Transactions: {mempool_info.get('size', 0):,}")
        print(f"  Memory Usage: {mempool_info.get('usage', 0):,} bytes")
        print(f"  Min Fee: {mempool_info.get('mempoolminfee', 0):.8f} BTC/kB")
        print()


    def listen_for_blocks_zmq(self) -> None:
        """Listen for ZMQ block notifications"""
        if not self.zmq_socket:
            print("❌ ZMQ socket not initialized")
            return

        print("Press Ctrl+C to stop")
        print()

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
                        self._process_new_block_hash_zmq(block_hash)

            except zmq.Again:
                # No message received (timeout)
                pass
            except KeyboardInterrupt:
                print("\n🛑 Monitoring stopped by user")
                self.running = False
                break
            except Exception as e:
                print(f"❌ Error in ZMQ listener: {e}")
                time.sleep(1)

    def _process_new_block_hash_zmq(self, block_hash: str) -> None:
        """Process a new block hash received via ZMQ"""
        try:
            # Get block details from RPC
            block_result = self.rpc_service.rpc_call('getblock', [block_hash])
            if 'result' not in block_result:
                print(f"❌ Could not get block details for {block_hash}")
                return

            block = block_result['result']
            current_height = block.get('height', 0)

            # Check if this is actually a new block
            if current_height <= self.last_block_height:
                return

            self.blocks_received += 1
            self._process_new_block(block, current_height)

        except Exception as e:
            print(f"❌ Error processing block hash {block_hash}: {e}")

    def check_for_new_block(self, blockchain_info):
        """Check if a new block was found"""
        if not blockchain_info:
            return False

        current_height = blockchain_info.get('blocks', 0)

        if current_height <= self.last_block_height or self.last_block_height <= 0:
            self.last_block_height = current_height
            return False

        return self._process_new_block(blockchain_info, current_height)

    def _process_new_block(self, block_or_info, current_height):
        """Process a new block that was found"""
        print()
        print("╔" + "═" * 80 + "╗")
        print(f"  Block Height: {current_height:,}")

        # Play sound notification
        self.play_block_sound()

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

                # Check cache first
                cache_key = f"block_{block_hash}"
                if cache_key in self._block_cache:
                    cached_data = self._block_cache[cache_key]
                    if time.time() - cached_data.get('timestamp', 0) < self._cache_max_age:
                        block = cached_data['data']
                    else:
                        # Cache expired, remove it
                        del self._block_cache[cache_key]
                        block = None
                else:
                    block = None

                if block is None:
                    block_result = self.rpc_service.rpc_call('getblock', [block_hash])
                    if 'result' not in block_result:
                        return self._handle_block_error()

                    block = block_result['result']
                    # Cache the block data
                    self._block_cache[cache_key] = {
                        'data': block,
                        'timestamp': time.time()
                    }

            current_block_time = datetime.fromtimestamp(block.get('time', 0))

            # Enhanced block information display
            print(f"  Block Hash: {block.get('hash', 'N/A')}")
            print(f"  Time: {current_block_time.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"  Transactions: {len(block.get('tx', [])):,}")

            block_size_bytes = block.get('size', 0)
            block_size_mb = block_size_bytes / (1024 * 1024)
            print(f"  Size: {block_size_mb:.2f} MB")

            block_weight = block.get('weight', 0)
            weight_mwu = block_weight / 1_000_000
            print(f"  Weight: {weight_mwu:.2f} MWU")

            # Mining pool information
            mining_pool = self._extract_and_display_mining_pool(block)

            # Time since last block
            time_since_last_block = self._display_time_since_last_block(current_block_time)

            # Block fees and rewards
            self._calculate_and_display_fees(block, mining_pool, time_since_last_block)

            # OP_RETURN data
            self._display_op_return_data(block)

            print("╚" + "═" * 80 + "╝")
            print()

            # Update last seen height and time to prevent detection loop
            self.last_block_height = current_height
            self.last_block_time = current_block_time
            return True

        except (requests.RequestException, KeyError, ValueError) as e:
            error_service.handle_critical_error("Block processing", e)
            print("╚" + "═" * 80 + "╝")
            print()
            return False

    def _handle_block_error(self):
        """Handle error when getting block details"""
        print("❌ Could not get block details")
        print("╚" + "═" * 60 + "╝")
        print()
        return False


    def _extract_and_display_mining_pool(self, block):
        """Extract and display mining pool information"""
        try:
            mining_pool = self.extract_mining_pool_info(block)
            if mining_pool:
                print(f"  Mining Pool: {mining_pool}")
            else:
                print("  Mining Pool: Unknown")
            return mining_pool
        except (requests.RequestException, KeyError, ValueError) as e:
            print(f"  Mining Pool: Error detecting ({str(e)[:30]}...)")
            return "Unknown"

    def _calculate_and_display_fees(self, block, mining_pool, time_since_last_block):
        """Calculate and display block fees"""
        block_details = None
        try:
            block_details = self.calculate_block_btc(block)
            if not block_details:
                print("  Block Fees: Calculating...")
                # Log block even if fee calculation failed
                self.log_block_to_json(block, mining_pool, None, time_since_last_block)
                return

            _, total_fees = block_details
            btc_price = self.get_bitcoin_price()

            if btc_price:
                usd_amount = total_fees * btc_price
                print(f"  Block Fees: {total_fees:.8f} BTC (${usd_amount:,.2f})")
            else:
                print(f"  Block Fees: {total_fees:.8f} BTC")

        except (requests.RequestException, KeyError, ValueError) as e:
            error_service.handle_api_error("Block fees calculation", e)
            print("  Block Fees: Error calculating")

        # Log block only once, regardless of fee calculation success/failure
        self.log_block_to_json(block, mining_pool, block_details, time_since_last_block)

    def _display_op_return_data(self, block):
        """Display OP_RETURN data from block transactions"""
        try:
            op_return_data = self.extract_op_return_data(block)
            if not op_return_data:
                return

            print(f"  OP_RETURN Data: {len(op_return_data)} transactions with embedded data")
            for i, data in enumerate(op_return_data[:10]):  # Show first 10
                display_data = data[:47] + "..." if len(data) > 50 else data
                print(f"    {i+1}. {display_data}")
            if len(op_return_data) > 10:
                print(f"    ... and {len(op_return_data) - 10} more")

        except (requests.RequestException, KeyError, ValueError) as e:
            error_service.handle_api_error("OP_RETURN data extraction", e)

    def _display_time_since_last_block(self, current_block_time):
        """Display time since last block and return formatted string"""
        if self.last_block_time is None:
            print("  Time Since Last Block: First block detected (no block history)")
            return "First block"

        time_diff = current_block_time - self.last_block_time
        total_seconds = int(time_diff.total_seconds())
        minutes = total_seconds // 60
        seconds = total_seconds % 60

        if minutes > 0:
            formatted_time = f"{minutes}m {seconds}s"
        else:
            formatted_time = f"{seconds}s"

        print(f"  Time Since Last Block: {formatted_time}")
        return formatted_time

    def extract_mining_pool_info(self, block):
        """Extract mining pool information from coinbase transaction"""
        try:
            coinbase_txid = self._get_coinbase_txid(block)
            if not coinbase_txid:
                return None

            tx = self._get_transaction_details(coinbase_txid)
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

    def _get_transaction_details(self, coinbase_txid):
        """Get transaction details from RPC call"""
        tx_result = self.rpc_service.rpc_call('getrawtransaction', [coinbase_txid, True])
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

        # Check for known pool signatures
        for signature, pool_name in mining_pools.items():
            if signature.lower() in coinbase_bytes.lower():
                return pool_name

        # Check for slash-separated format
        slash_pool = self._check_slash_format(coinbase_bytes)
        if slash_pool:
            return slash_pool

        # Return truncated hex if no known pool found
        if len(coinbase_hex) > 20:
            return f"Unknown Pool ({coinbase_hex[:20]}...)"

        return "Solo Miner / Unknown"

    def _get_mining_pool_signatures(self):
        """Get dictionary of mining pool signatures from API"""
        # Try to get signatures from API
        try:
            # Get the API URL (could be configurable)
            api_url = os.getenv('POOLS_API_URL', 'http://localhost:8081')
            response = requests.get(f"{api_url}/api/pools/signatures", timeout=5)

            if response.status_code == 200:
                signatures_dict = response.json()
                # Convert string keys to bytes for compatibility
                signatures = {k.encode('utf-8'): v for k, v in signatures_dict.items()}
                return signatures
            print(f"Warning: API returned status {response.status_code}")
            return {}

        except (requests.RequestException, KeyError, ValueError) as e:
            print(f"Error: Could not fetch from pools API: {e}")
            raise RuntimeError(f"Pools API is unavailable: {e}") from e

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
            # Get the coinbase transaction (first transaction)
            if not block.get('tx') or len(block['tx']) == 0:
                return None

            coinbase_txid = block['tx'][0]
            tx_result = self.rpc_service.rpc_call('getrawtransaction', [coinbase_txid, True])

            if 'result' not in tx_result:
                return None

            coinbase_tx = tx_result['result']
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

            # OP_RETURN transactions start with "OP_RETURN"
            if asm.startswith('OP_RETURN'):
                # Extract the data after OP_RETURN
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

            # Less common formats
            self._try_url_decoding(data_bytes, decoded_results)
            self._try_address_decoding(data_bytes, decoded_results)
            self._try_timestamp_decoding(data_bytes, decoded_results)
            self._try_numeric_decoding(data_bytes, decoded_results)

            # Return results or fallback to hex
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

        # Remove non-printable ASCII characters and limit to basic printable characters
        # Allow letters, numbers, spaces, and common punctuation
        sanitized = ''.join(
            c for c in pool_name
            if c.isprintable() and (c.isalnum() or c in ' .-_/()[]{}:')
        )

        # Remove excessive whitespace
        sanitized = ' '.join(sanitized.split())

        # Limit length to reasonable size
        if len(sanitized) > 50:
            sanitized = sanitized[:50].strip()

        # If sanitization resulted in empty string, return Unknown
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
            'block_time': datetime.fromtimestamp(block.get('time', 0)).strftime('%Y-%m-%d %H:%M:%S'),
            'time_since_last_block': time_since_last_block
        }

    def _load_blocks_json(self) -> Dict[str, Any]:
        """Load blocks.json; return {'blocks': [...]} or {'blocks': []}."""
        data_dir = self._get_data_dir()
        json_file = os.path.join(data_dir, os.path.basename(DEFAULT_BLOCKS_JSON))
        if not os.path.isfile(json_file):
            return {'blocks': []}
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                content = f.read().replace('\x00', '')
                data = json.loads(content)
            return {'blocks': data.get('blocks') or []}
        except (OSError, json.JSONDecodeError):
            return {'blocks': []}

    def _save_blocks_json(self, data: Dict[str, Any]) -> None:
        """Write blocks.json with file locking."""
        data_dir = self._get_data_dir()
        os.makedirs(data_dir, exist_ok=True)
        json_file = os.path.join(data_dir, os.path.basename(DEFAULT_BLOCKS_JSON))
        json_file = os.path.abspath(json_file)
        with open(json_file, 'w', encoding='utf-8') as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                json.dump(data, f, indent=2)
                f.flush()
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)

    def log_block_to_json(self, block, mining_pool, block_details, time_since_last_block):
        """Append block to blocks.json (keep last BLOCKS_JSON_MAX_ENTRIES), then update distribution.json."""
        block_height = block.get('height', 0)
        if block_height <= self._last_logged_block_height:
            return
        try:
            data = self._load_blocks_json()
            blocks = list(data.get('blocks') or [])
            for b in blocks:
                if int(b.get('block_height', 0)) == block_height:
                    return
            block_dict = self._prepare_block_dict(
                block, mining_pool, block_details, time_since_last_block
            )
            blocks.append(block_dict)
            blocks = blocks[-BLOCKS_JSON_MAX_ENTRIES:]
            self._save_blocks_json({'blocks': blocks})
            self._last_logged_block_height = block_height
            self._update_distribution_json(blocks)
        except (OSError, IOError, KeyError, ValueError) as e:
            error_service.handle_file_error("blocks.json", "write", e)

    def _update_distribution_json(self, blocks: List[Dict[str, Any]]) -> None:
        """Compute pool distribution from blocks and write distribution.json."""
        by_pool: Dict[str, int] = {}
        for b in blocks:
            pool = (b.get('mining_pool') or 'unknown').strip() or 'unknown'
            by_pool[pool] = by_pool.get(pool, 0) + 1
        total = sum(by_pool.values()) or 1
        by_percentage = {p: round(count * 100.0 / total, 2) for p, count in by_pool.items()}
        data_dir = self._get_data_dir()
        os.makedirs(data_dir, exist_ok=True)
        json_file = os.path.join(data_dir, os.path.basename(DEFAULT_DISTRIBUTION_JSON))
        payload = {
            'updated': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            'blocks_count': len(blocks),
            'by_pool': by_pool,
            'by_percentage': by_percentage
        }
        try:
            with open(json_file, 'w', encoding='utf-8') as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                try:
                    json.dump(payload, f, indent=2)
                    f.flush()
                finally:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        except (OSError, IOError) as e:
            error_service.handle_file_error("distribution.json", "write", e)

    def _load_difficulty_json(self) -> Dict[str, Any]:
        """Load difficulty.json; return {'history': [...]} or {'history': []}."""
        data_dir = self._get_data_dir()
        json_file = os.path.join(data_dir, os.path.basename(DEFAULT_DIFFICULTY_JSON))
        if not os.path.isfile(json_file):
            return {'history': []}
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                content = f.read().replace('\x00', '')
                data = json.loads(content)
            return {'history': data.get('history') or []}
        except (OSError, json.JSONDecodeError):
            return {'history': []}

    def _save_difficulty_json(self, data: Dict[str, Any]) -> None:
        """Write difficulty.json with file locking."""
        data_dir = self._get_data_dir()
        os.makedirs(data_dir, exist_ok=True)
        json_file = os.path.join(data_dir, os.path.basename(DEFAULT_DIFFICULTY_JSON))
        json_file = os.path.abspath(json_file)
        with open(json_file, 'w', encoding='utf-8') as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                json.dump(data, f, indent=2)
                f.flush()
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)

    def log_difficulty_to_json(self, hashrate: Optional[float], difficulty: Optional[float]) -> None:
        """Append one difficulty/hashrate record to difficulty.json (keep last N)."""
        try:
            blockchain_info = self.get_blockchain_info()
            block_height = blockchain_info.get('blocks', 0) if blockchain_info else 0
            data = self._load_difficulty_json()
            history = list(data.get('history') or [])
            record = {
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'blockHeight': block_height,
                'hashRate': round(hashrate, 2) if hashrate is not None else None,
                'difficulty': round(difficulty, 2) if difficulty is not None else None
            }
            history.append(record)
            history = history[-DIFFICULTY_JSON_MAX_ENTRIES:]
            self._save_difficulty_json({'history': history})
        except (OSError, IOError, KeyError, ValueError) as e:
            error_service.handle_file_error("difficulty.json", "write", e)

    def check_mempool_changes(self, mempool_info):
        """Check for significant mempool changes"""
        if not mempool_info:
            return

        current_size = mempool_info.get('size', 0)

        self.last_mempool_size = current_size

    def check_and_log_network_data(self):
        """Check and log network data if enough time has passed"""
        current_time = datetime.now()

        # Check if enough time has passed since last network data log
        if (self._last_network_log_time is None or
            (current_time - self._last_network_log_time).total_seconds() >= self._network_log_interval):

            # Get current network data
            hashrate = self.get_network_hashrate()
            difficulty = self.get_network_difficulty()

            # Log to difficulty.json if we have valid data
            if hashrate is not None or difficulty is not None:
                self.log_difficulty_to_json(hashrate, difficulty)
                self._last_network_log_time = current_time

                # Update cached values
                if hashrate is not None:
                    self._last_hashrate = hashrate
                if difficulty is not None:
                    self._last_difficulty = difficulty

                hr_str = f"{hashrate:.2f}" if hashrate is not None else "N/A"
                diff_str = f"{difficulty:.2f}" if difficulty is not None else "N/A"
                print(f"📊 Network data logged - Hashrate: {hr_str} TH/s, Difficulty: {diff_str}")

    def monitor_continuous(self, interval=10):
        """Monitor blockchain continuously with hybrid ZMQ/polling support"""

        # Try ZMQ first
        if self.setup_zmq():
            self.monitoring_mode = "ZMQ"
            self.display_header()

            # Setup signal handler for graceful shutdown
            def signal_handler(sig, frame):  # pylint: disable=unused-argument
                print("\n🛑 Shutting down...")
                self.running = False
                self.cleanup_zmq()
                sys.exit(0)

            signal.signal(signal.SIGINT, signal_handler)

            try:
                self.listen_for_blocks_zmq()
            finally:
                self.cleanup_zmq()
            return

        # Fallback to polling
        print("❌ ZMQ connection failed. Falling back to polling mode...")
        self.monitoring_mode = "Polling"
        self.display_header()

        try:
            while True:
                # Get current information
                blockchain_info = self.get_blockchain_info()
                mempool_info = self.get_mempool_info()

                # Check for new blocks
                new_block = self.check_for_new_block(blockchain_info)

                # Check for mempool changes
                if not new_block:  # Don't show mempool changes when there's a new block
                    self.check_mempool_changes(mempool_info)

                # Check and log network data periodically
                self.check_and_log_network_data()

                time.sleep(interval)

        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped by user")
        except (requests.RequestException, KeyError, ValueError) as e:
            error_service.handle_critical_error("Blockchain monitoring", e)

    def cleanup_zmq(self):
        """Cleanup ZMQ resources"""
        if self.zmq_socket:
            self.zmq_socket.close()
        if self.zmq_context:
            self.zmq_context.term()

    def show_current_status(self):
        """Show current blockchain status once"""
        print("📊 BITCOIN BLOCKCHAIN STATUS")
        print("=" * 80)

        blockchain_info = self.get_blockchain_info()
        if blockchain_info:
            print(f"Current Block: {blockchain_info.get('blocks', 'N/A'):,}")
            print(f"Block Hash: {blockchain_info.get('bestblockhash', 'N/A')}")
            print(f"Difficulty: {blockchain_info.get('difficulty', 0):,.2f}")
            print(f"Chain: {blockchain_info.get('chain', 'N/A')}")
            print(f"Sync Progress: {blockchain_info.get('verificationprogress', 0):.1%}")

        mempool_info = self.get_mempool_info()
        if mempool_info:
            print(f"Mempool Transactions: {mempool_info.get('size', 0):,}")

        network_info = self.get_network_info()
        if network_info:
            print(f"Peer Connections: {network_info.get('connections', 0)}")

def main():
    """Main function with command line argument handling"""
    import argparse

    parser = argparse.ArgumentParser(description='Bitcoin Blockchain Monitor with ZMQ support')
    parser.add_argument('--zmq-endpoint', default='tcp://127.0.0.1:28332',
                       help='ZMQ endpoint for block notifications (default: tcp://127.0.0.1:28332)')
    parser.add_argument('--continuous', '-c', nargs='?', const=10, type=int, metavar='interval',
                       help='Start continuous monitoring (default: 10 seconds)')
    parser.add_argument('--status', '-s', action='store_true',
                       help='Show current status once and exit')
    parser.add_argument('--no-sound', action='store_true',
                       help='Disable sound notifications')
    parser.add_argument('--volume', type=float, default=0.6, metavar='VOLUME',
                       help='Set sound volume (0.0 to 1.0, default: 0.6)')

    args = parser.parse_args()

    # Create monitor instance
    monitor = BlockchainMonitor(args.zmq_endpoint)

    if args.no_sound:
        monitor.sound_enabled = False

    # Set volume if specified
    if hasattr(args, 'volume') and args.volume is not None:
        monitor.sound_volume = max(0.0, min(1.0, args.volume))  # Clamp between 0.0 and 1.0

    if args.status:
        monitor.show_current_status()
    elif args.continuous is not None:
        monitor.monitor_continuous(args.continuous)
    else:
        monitor.display_header()
        monitor.show_current_status()

if __name__ == "__main__":
    main()
