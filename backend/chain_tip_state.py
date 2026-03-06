"""
Shared in-process chain-tip state.

The block monitor updates this on each new block so lightweight API endpoints
can serve "latest block seen" without expensive RPC/DB work per request.
"""

from datetime import datetime, timezone
import threading
from typing import Any, Dict, Optional

_lock = threading.Lock()
_chain_tip: Dict[str, Any] = {
    "height": None,
    "hash": None,
    "mining_pool": None,
    "transaction_count": None,
    "updated_at": None,
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def get_chain_tip() -> Dict[str, Any]:
    """Return a shallow copy of latest chain tip state."""
    with _lock:
        return dict(_chain_tip)


def set_chain_tip(  # pylint: disable=too-many-arguments
    *,
    height: Optional[int],
    block_hash: Optional[str] = None,
    mining_pool: Optional[str] = None,
    transaction_count: Optional[int] = None,
    updated_at: Optional[str] = None,
) -> None:
    """Set chain-tip fields atomically."""
    if updated_at is None:
        updated_at = _utc_now_iso()
    with _lock:
        _chain_tip["height"] = int(height) if isinstance(height, int) else None
        _chain_tip["hash"] = str(block_hash) if block_hash else None
        _chain_tip["mining_pool"] = str(mining_pool) if mining_pool else None
        _chain_tip["transaction_count"] = (
            int(transaction_count) if isinstance(transaction_count, int) else None
        )
        _chain_tip["updated_at"] = updated_at
