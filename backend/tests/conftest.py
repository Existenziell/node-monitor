"""
Shared pytest fixtures for backend tests.
"""
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# Ensure backend is on path when running tests (e.g. from repo root)
_backend = Path(__file__).resolve().parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))


@pytest.fixture
def sample_config():
    """Minimal valid config dict for cookie auth (no keyring)."""
    return {
        "rpc_url": "http://127.0.0.1:8332",
        "rpc_port": 8332,
        "cookie_file": "/nonexistent/cookie",
        "auth_method": "cookie",
    }


@pytest.fixture
def sample_block():
    """Minimal block dict as returned by getblock RPC."""
    return {
        "hash": "0000000000000000000123456789abcdef",
        "height": 800000,
        "time": 1600000000,
        "size": 1250000,
        "weight": 4000000,
        "tx": ["txid0", "txid1"],
        "difficulty": 20000000000000,
        "nonce": 0,
    }


@pytest.fixture
def sample_mempool():
    """Minimal mempool info dict."""
    return {
        "size": 5000,
        "bytes": 2000000,
        "usage": 5000000,
        "maxmempool": 300000000,
    }


@pytest.fixture
def mock_rpc_response_ok():
    """RPC response with result (no error)."""

    def _make(result):
        return {"result": result, "error": None, "id": "monitor"}

    return _make


@pytest.fixture
def mock_rpc_response_error():
    """RPC response with error."""

    def _make(message="RPC error", code=-1):
        return {"result": None, "error": {"message": message, "code": code}, "id": "monitor"}

    return _make


@pytest.fixture
def temp_data_dir(tmp_path):
    """A temporary directory suitable for data files (e.g. blocks.json)."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    return data_dir


@pytest.fixture
def mock_requests_post(monkeypatch):
    """Mock requests.post for RPC/HTTP calls. Returns a MagicMock by default."""
    mock = MagicMock()
    monkeypatch.setattr("requests.post", mock)
    return mock
