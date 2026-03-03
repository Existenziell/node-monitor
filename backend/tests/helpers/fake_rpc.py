"""
Fake RPC client for tests: no real HTTP, returns configurable responses.
"""
from typing import Any, Dict, List, Optional


class FakeRPCService:
    """In-memory RPC service that returns predefined results."""

    def __init__(self, responses: Optional[Dict[str, Any]] = None):
        self.responses = responses or {}
        self.calls: List[tuple] = []  # (method, params) for each rpc_call

    def rpc_call(self, method: str, params: Optional[List] = None) -> Dict[str, Any]:
        if params is None:
            params = []
        self.calls.append((method, list(params)))
        key = method
        if key in self.responses:
            out = self.responses[key]
            return out if isinstance(out, dict) and ("result" in out or "error" in out) else {"result": out}
        return {"error": f"No stub for method: {method}"}

    def get_blockchain_info(self) -> Dict[str, Any]:
        return self.rpc_call("getblockchaininfo")

    def get_block_count(self) -> Dict[str, Any]:
        return self.rpc_call("getblockcount")

    def get_block(self, block_hash: str, verbosity: int = 1) -> Dict[str, Any]:
        return self.rpc_call("getblock", [block_hash, verbosity])

    def get_block_hash(self, height: int) -> Dict[str, Any]:
        return self.rpc_call("getblockhash", [height])

    def get_network_info(self) -> Dict[str, Any]:
        return self.rpc_call("getnetworkinfo")

    def get_mempool_info(self) -> Dict[str, Any]:
        return self.rpc_call("getmempoolinfo")

    def get_raw_transaction(self, txid: str, verbose: bool = True) -> Dict[str, Any]:
        return self.rpc_call("getrawtransaction", [txid, verbose])

    def test_connection(self) -> bool:
        result = self.get_blockchain_info()
        return "error" not in result or not result.get("error")
