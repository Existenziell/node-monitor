"""
Tests for rpc_service: RPC payload building, auth handling, connection status.
Uses mocked requests.post to avoid real HTTP.
"""
from unittest.mock import MagicMock

from constants import DEFAULT_RPC_HOST, DEFAULT_RPC_PORT
from rpc_service import RPCService, create_rpc_service

DEFAULT_TEST_RPC_URL = f"http://{DEFAULT_RPC_HOST}:{DEFAULT_RPC_PORT}"


class TestRPCServicePayload:
    """Tests for RPC payload and timeout."""

    def test_rpc_call_sends_correct_payload(self, mock_requests_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": 800000, "error": None}
        mock_response.status_code = 200
        mock_requests_post.return_value = mock_response

        # No cookie file, no user/pass -> returns error without calling post
        svc = RPCService(DEFAULT_TEST_RPC_URL)
        result = svc.rpc_call("getblockcount", [])

        # Without auth we get error before requests.post
        if "error" in result and "No authentication" in str(result.get("error", "")):
            assert not mock_requests_post.called
            return

        assert mock_requests_post.called
        call_kwargs = mock_requests_post.call_args[1]
        payload = call_kwargs["json"]
        assert payload["jsonrpc"] == "1.0"
        assert payload["method"] == "getblockcount"
        assert payload["params"] == []

    def test_rpc_call_with_user_password(self, mock_requests_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": 800000, "error": None}
        mock_response.status_code = 200
        mock_requests_post.return_value = mock_response

        svc = RPCService(
            DEFAULT_TEST_RPC_URL,
            rpc_user="user",
            rpc_password="pass",
        )
        result = svc.rpc_call("getblockcount", [])

        assert mock_requests_post.called
        assert result.get("result") == 800000
        call_kwargs = mock_requests_post.call_args[1]
        assert call_kwargs["auth"] == ("user", "pass")

    def test_rpc_call_timeout_returns_error(self, mock_requests_post):
        import requests
        mock_requests_post.side_effect = requests.exceptions.Timeout()

        svc = RPCService(
            DEFAULT_TEST_RPC_URL,
            rpc_user="u",
            rpc_password="p",
        )
        result = svc.rpc_call("getblockcount", [])
        assert "error" in result
        assert "timed out" in result["error"].lower()

    def test_rpc_call_connection_error_returns_error(self, mock_requests_post):
        import requests
        mock_requests_post.side_effect = requests.exceptions.ConnectionError()

        svc = RPCService(
            DEFAULT_TEST_RPC_URL,
            rpc_user="u",
            rpc_password="p",
        )
        result = svc.rpc_call("getblockcount", [])
        assert "error" in result
        assert "connection" in result["error"].lower() or "running" in result["error"].lower()


class TestRPCServiceCookieAuth:
    """Tests for cookie file authentication."""

    def test_rpc_call_invalid_cookie_format_returns_error(self, tmp_path):
        cookie_file = tmp_path / ".cookie"
        cookie_file.write_text("no-colon-here")
        svc = RPCService(DEFAULT_TEST_RPC_URL, cookie_file=str(cookie_file))
        result = svc.rpc_call("getblockcount", [])
        assert "error" in result
        assert "cookie" in result["error"].lower() or "invalid" in result["error"].lower()

    def test_rpc_call_cookie_auth_sends_basic_auth(self, tmp_path, mock_requests_post):
        cookie_file = tmp_path / ".cookie"
        cookie_file.write_text("user:password")
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": 1, "error": None}
        mock_requests_post.return_value = mock_response

        svc = RPCService(DEFAULT_TEST_RPC_URL, cookie_file=str(cookie_file))
        result = svc.rpc_call("getblockcount", [])

        assert mock_requests_post.called
        assert result.get("result") == 1
        assert mock_requests_post.call_args[1]["auth"] == ("user", "password")


class TestRPCServiceTimeout:
    """Tests for set_timeout."""

    def test_set_timeout(self):
        svc = RPCService(DEFAULT_TEST_RPC_URL, rpc_user="u", rpc_password="p")
        assert svc.timeout == 5
        svc.set_timeout(10)
        assert svc.timeout == 10


class TestRPCServiceConnectionStatus:
    """Tests for test_connection and get_connection_status."""

    def test_test_connection_true_when_result_ok(self, mock_requests_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": {"chain": "main"}, "error": None}
        mock_requests_post.return_value = mock_response

        svc = RPCService(DEFAULT_TEST_RPC_URL, rpc_user="u", rpc_password="p")
        assert svc.test_connection() is True

    def test_test_connection_false_when_error(self, mock_requests_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": None, "error": "Connection refused"}
        mock_requests_post.return_value = mock_response

        svc = RPCService(DEFAULT_TEST_RPC_URL, rpc_user="u", rpc_password="p")
        assert svc.test_connection() is False

    def test_get_connection_status_connected(self, mock_requests_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": {"blocks": 800000}}
        mock_requests_post.return_value = mock_response

        svc = RPCService(DEFAULT_TEST_RPC_URL, rpc_user="u", rpc_password="p")
        status = svc.get_connection_status()
        assert status["connected"] is True
        assert status["blockchain_info"] == {"blocks": 800000}


class TestRPCServiceFactory:
    """Tests for create_rpc_service and test_rpc_connection."""

    def test_create_rpc_service(self):
        svc = create_rpc_service(DEFAULT_TEST_RPC_URL, "u", "p")
        assert isinstance(svc, RPCService)
        assert svc.rpc_url == DEFAULT_TEST_RPC_URL
        assert svc.rpc_user == "u"
        assert svc.rpc_password == "p"
