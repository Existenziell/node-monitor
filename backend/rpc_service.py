#!/usr/bin/env python3
"""
RPC Service
Centralized service for Bitcoin node RPC communication with connection management
"""

import os
from typing import Dict, Any, Optional, List

import requests

from constants import DEFAULT_RPC_TIMEOUT


class RPCService:
    """Centralized service for Bitcoin node RPC communication."""

    def __init__(self, rpc_url: str, rpc_user: Optional[str] = None, rpc_password: Optional[str] = None, cookie_file: Optional[str] = None):
        """Initialize the RPC service with connection details.
        
        Args:
            rpc_url: RPC endpoint URL
            rpc_user: RPC username (optional, for legacy auth)
            rpc_password: RPC password (optional, for legacy auth)
            cookie_file: Path to cookie file (preferred method)
        """
        self.rpc_url = rpc_url
        self.rpc_user = rpc_user
        self.rpc_password = rpc_password
        self.cookie_file = cookie_file
        self.timeout = 5  # Default timeout in seconds

    def rpc_call(self, method: str, params: Optional[List] = None) -> Dict[str, Any]:
        """Make an RPC call to Bitcoin node."""
        if params is None:
            params = []

        payload = {
            "jsonrpc": "1.0",
            "id": "monitor",
            "method": method,
            "params": params
        }

        try:
            # Prepare authentication
            auth = None
            headers = {}

            if self.cookie_file and os.path.exists(self.cookie_file):
                # Use cookie authentication (preferred)
                with open(self.cookie_file, 'r', encoding='utf-8') as f:
                    cookie_content = f.read().strip()
                # Parse cookie content (format: username:password)
                if ':' in cookie_content:
                    username, password = cookie_content.split(':', 1)
                    auth = (username, password)
                else:
                    return {"error": "Invalid cookie file format"}
            elif self.rpc_user and self.rpc_password:
                # Use username/password authentication (legacy)
                auth = (self.rpc_user, self.rpc_password)
            else:
                return {"error": "No authentication method configured"}

            response = requests.post(
                self.rpc_url,
                json=payload,
                auth=auth,
                headers=headers,
                timeout=self.timeout or DEFAULT_RPC_TIMEOUT
            )
            return response.json()
        except requests.exceptions.Timeout:
            return {"error": "RPC call timed out"}
        except requests.exceptions.ConnectionError:
            return {"error": "Connection failed - is Bitcoin node running?"}
        except requests.exceptions.RequestException as e:
            return {"error": f"Request failed: {str(e)}"}
        except Exception as e:
            return {"error": f"Unexpected error: {str(e)}"}

    def set_timeout(self, timeout_seconds: int) -> None:
        """Set RPC call timeout."""
        self.timeout = timeout_seconds

    # Blockchain Information Methods
    def get_blockchain_info(self) -> Dict[str, Any]:
        """Get blockchain information."""
        return self.rpc_call("getblockchaininfo")

    def get_block_count(self) -> Dict[str, Any]:
        """Get current block count."""
        return self.rpc_call("getblockcount")

    def get_best_block_hash(self) -> Dict[str, Any]:
        """Get the hash of the best block."""
        return self.rpc_call("getbestblockhash")

    def get_block_hash(self, height: int) -> Dict[str, Any]:
        """Get block hash by height."""
        return self.rpc_call("getblockhash", [height])

    def get_block(self, block_hash: str, verbosity: int = 1) -> Dict[str, Any]:
        """Get block information."""
        return self.rpc_call("getblock", [block_hash, verbosity])

    # Network Information Methods
    def get_network_info(self) -> Dict[str, Any]:
        """Get network information."""
        return self.rpc_call("getnetworkinfo")

    def get_peer_info(self) -> Dict[str, Any]:
        """Get peer information."""
        return self.rpc_call("getpeerinfo")

    def get_connection_count(self) -> Dict[str, Any]:
        """Get connection count."""
        return self.rpc_call("getconnectioncount")

    def get_net_totals(self) -> Dict[str, Any]:
        """Get network totals."""
        return self.rpc_call("getnettotals")

    # Mempool Information Methods
    def get_mempool_info(self) -> Dict[str, Any]:
        """Get mempool information."""
        return self.rpc_call("getmempoolinfo")

    def get_mempool_ancestors(self, txid: str) -> Dict[str, Any]:
        """Get mempool ancestors of a transaction."""
        return self.rpc_call("getmempoolancestors", [txid])

    def get_mempool_descendants(self, txid: str) -> Dict[str, Any]:
        """Get mempool descendants of a transaction."""
        return self.rpc_call("getmempooldescendants", [txid])

    def get_raw_mempool(self, verbose: bool = False) -> Dict[str, Any]:
        """Get raw mempool."""
        return self.rpc_call("getrawmempool", [verbose])

    # Wallet Information Methods
    def get_wallet_info(self) -> Dict[str, Any]:
        """Get wallet information."""
        return self.rpc_call("getwalletinfo")

    def get_balance(self) -> Dict[str, Any]:
        """Get wallet balance."""
        return self.rpc_call("getbalance")

    def get_unspent_outputs(self, minconf: int = 1, maxconf: int = 9999999) -> Dict[str, Any]:
        """Get unspent transaction outputs."""
        return self.rpc_call("listunspent", [minconf, maxconf])

    def get_transaction(self, txid: str, include_watchonly: bool = True) -> Dict[str, Any]:
        """Get transaction details."""
        return self.rpc_call("gettransaction", [txid, include_watchonly])

    def get_raw_transaction(self, txid: str, verbose: bool = True) -> Dict[str, Any]:
        """Get raw transaction."""
        return self.rpc_call("getrawtransaction", [txid, verbose])

    def list_transactions(self, label: str = "*", count: int = 100, skip: int = 0, include_watchonly: bool = True) -> Dict[str, Any]:
        """List wallet transactions."""
        return self.rpc_call("listtransactions", [label, count, skip, include_watchonly])

    # Network Hashrate Methods
    def get_network_hashrate(self, nblocks: int = 120) -> Dict[str, Any]:
        """Get network hashrate."""
        return self.rpc_call("getnetworkhashps", [nblocks])

    def get_difficulty(self) -> Dict[str, Any]:
        """Get current difficulty."""
        return self.rpc_call("getdifficulty")

    # System Information Methods
    def get_memory_info(self) -> Dict[str, Any]:
        """Get memory usage information."""
        return self.rpc_call("getmemoryinfo")

    def get_index_info(self) -> Dict[str, Any]:
        """Get indexing information."""
        return self.rpc_call("getindexinfo")

    def get_rpc_info(self) -> Dict[str, Any]:
        """Get RPC information."""
        return self.rpc_call("getrpcinfo")

    def uptime(self) -> Dict[str, Any]:
        """Get node uptime."""
        return self.rpc_call("uptime")

    # Utility Methods
    def validate_address(self, address: str) -> Dict[str, Any]:
        """Validate a Bitcoin address."""
        return self.rpc_call("validateaddress", [address])

    def get_address_info(self, address: str) -> Dict[str, Any]:
        """Get address information."""
        return self.rpc_call("getaddressinfo", [address])

    def estimate_smart_fee(self, target_blocks: int = 6) -> Dict[str, Any]:
        """Estimate smart fee."""
        return self.rpc_call("estimatesmartfee", [target_blocks])

    def get_fee_estimate(self, target_blocks: int = 6) -> Dict[str, Any]:
        """Get fee estimate."""
        return self.rpc_call("getfeeestimate", [target_blocks])

    # Connection Testing
    def test_connection(self) -> bool:
        """Test if RPC connection is working."""
        result = self.get_blockchain_info()
        return "error" not in result or result.get("error") is None

    def get_connection_status(self) -> Dict[str, Any]:
        """Get detailed connection status."""
        status = {
            "connected": False,
            "error": None,
            "blockchain_info": None,
            "network_info": None
        }

        # Test blockchain info
        blockchain_result = self.get_blockchain_info()
        if "error" in blockchain_result and blockchain_result["error"]:
            status["error"] = blockchain_result["error"]
            return status

        status["connected"] = True
        status["blockchain_info"] = blockchain_result.get("result", {})

        # Test network info
        network_result = self.get_network_info()
        if "error" not in network_result:
            status["network_info"] = network_result.get("result", {})

        return status

    def get_service_info(self) -> Dict[str, Any]:
        """Get information about this RPC service."""
        return {
            "rpc_url": self.rpc_url,
            "timeout": self.timeout,
            "connected": self.test_connection()
        }


def create_rpc_connection():
    """Create RPC connection using secure configuration (loads config, returns RPCService or None).
    Environment RPC_HOST (and optionally RPC_PORT) override the config host/port for local dev (e.g. connect to node on Pi).
    """
    try:
        from config_service import config_service
        config = config_service.load_config()
        if config:
            rpc_url = config["rpc_url"]
            rpc_host_env = os.environ.get("RPC_HOST")
            rpc_port_env = os.environ.get("RPC_PORT")
            if rpc_host_env:
                from urllib.parse import urlparse
                parsed = urlparse(rpc_url)
                port = rpc_port_env if rpc_port_env else (parsed.port or 8332)
                rpc_url = f"http://{rpc_host_env.strip()}:{port}"
            cookie_file = config.get("cookie_file")
            if cookie_file and os.path.exists(cookie_file):
                return RPCService(rpc_url, cookie_file=cookie_file)
            return RPCService(
                rpc_url,
                config.get("rpc_user"),
                config.get("rpc_password")
            )
    except ImportError:
        pass
    return None


def create_rpc_service(rpc_url: str, rpc_user: Optional[str] = None, rpc_password: Optional[str] = None, cookie_file: Optional[str] = None) -> RPCService:
    """Create an RPC service instance with explicit credentials."""
    return RPCService(rpc_url, rpc_user, rpc_password, cookie_file)


def test_rpc_connection(rpc_url: str, rpc_user: Optional[str] = None, rpc_password: Optional[str] = None, cookie_file: Optional[str] = None) -> bool:
    """Test RPC connection with given credentials."""
    service = RPCService(rpc_url, rpc_user, rpc_password, cookie_file)
    return service.test_connection()
