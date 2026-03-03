"""
Tests for error_service: error handling, logging, summaries, export.
"""
# pylint: disable=redefined-outer-name,protected-access
import json
import tempfile
from unittest.mock import patch

import pytest

from error_service import ErrorService, handle_rpc_error


@pytest.fixture
def error_svc():
    """Fresh ErrorService instance with empty log."""
    return ErrorService()


class TestErrorServiceRpcError:
    """Tests for handle_rpc_error."""

    def test_handle_rpc_error_success_response_returns_true(self, error_svc):
        response = {"result": {"blocks": 800000}, "error": None}
        assert error_svc.handle_rpc_error(response) is True
        assert handle_rpc_error(response) is True

    def test_handle_rpc_error_error_response_returns_false(self, error_svc):
        response = {"result": None, "error": {"message": "RPC failed", "code": -1}}
        assert error_svc.handle_rpc_error(response) is False
        assert handle_rpc_error(response) is False

    def test_handle_rpc_error_string_error_logged(self, error_svc):
        response = {"error": "Connection refused"}
        assert error_svc.handle_rpc_error(response) is False
        assert len(error_svc.error_log) == 1
        assert error_svc.error_log[0]["error_type"] == "RPC_ERROR"


class TestErrorServiceErrorLog:
    """Tests for error log management."""

    def test_log_error_appends_and_caps_at_max(self, error_svc):
        error_svc.max_log_entries = 3
        error_svc._log_error("op1", "err1", "TYPE1")
        error_svc._log_error("op2", "err2", "TYPE2")
        error_svc._log_error("op3", "err3", "TYPE3")
        error_svc._log_error("op4", "err4", "TYPE4")
        assert len(error_svc.error_log) == 3
        assert error_svc.error_log[0]["operation"] == "op2"

    def test_get_error_log_returns_copy(self, error_svc):
        error_svc._log_error("op", "err", "TYPE")
        log = error_svc.get_error_log()
        assert log == error_svc.error_log
        log.clear()
        assert len(error_svc.error_log) == 1

    def test_get_error_summary(self, error_svc):
        error_svc._log_error("op1", "e1", "A")
        error_svc._log_error("op2", "e2", "A")
        error_svc._log_error("op3", "e3", "B")
        summary = error_svc.get_error_summary()
        assert summary == {"A": 2, "B": 1}

    def test_clear_error_log(self, error_svc):
        error_svc._log_error("op", "err", "TYPE")
        error_svc.clear_error_log()
        assert len(error_svc.error_log) == 0

    def test_get_recent_errors(self, error_svc):
        for i in range(5):
            error_svc._log_error(f"op{i}", f"e{i}", "TYPE")
        recent = error_svc.get_recent_errors(2)
        assert len(recent) == 2
        assert recent[0]["operation"] == "op3"
        assert recent[1]["operation"] == "op4"

    def test_get_recent_errors_empty_log(self, error_svc):
        assert error_svc.get_recent_errors(10) == []

    def test_has_errors(self, error_svc):
        assert error_svc.has_errors() is False
        error_svc._log_error("op", "err", "TYPE")
        assert error_svc.has_errors() is True

    def test_get_critical_errors(self, error_svc):
        error_svc._log_error("op1", "e1", "CRITICAL_ERROR")
        error_svc._log_error("op2", "e2", "RPC_ERROR")
        critical = error_svc.get_critical_errors()
        assert len(critical) == 1
        assert critical[0]["error_type"] == "CRITICAL_ERROR"


class TestErrorServiceSetMaxLogEntries:
    """Tests for set_max_log_entries."""

    def test_set_max_log_entries_trims_existing(self, error_svc):
        error_svc.max_log_entries = 10
        for i in range(5):
            error_svc._log_error(f"op{i}", f"e{i}", "TYPE")
        error_svc.set_max_log_entries(2)
        assert len(error_svc.error_log) == 2


class TestErrorServiceExportErrorLog:
    """Tests for export_error_log."""

    def test_export_error_log_success(self, error_svc):
        error_svc._log_error("op", "err", "TYPE")
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            path = f.name
        try:
            assert error_svc.export_error_log(path) is True
            with open(path, encoding="utf-8") as fp:
                data = json.load(fp)
            assert len(data) == 1
            assert data[0]["operation"] == "op"
        finally:
            import os
            os.unlink(path)

    def test_export_error_log_invalid_path_returns_false(self, error_svc):
        with patch("builtins.open", side_effect=PermissionError("denied")):
            assert error_svc.export_error_log("/nonexistent/dir/file.json") is False


class TestErrorServiceHandlersNoRaise:
    """Smoke tests: handlers must not raise (they print and log)."""

    def test_handle_connection_error(self, error_svc):
        error_svc.handle_connection_error("TestOp")

    def test_handle_config_error(self, error_svc):
        error_svc.handle_config_error()

    def test_handle_validation_error(self, error_svc):
        error_svc.handle_validation_error("field", "bad", "int")

    def test_handle_timeout_error(self, error_svc):
        error_svc.handle_timeout_error("Op", 30)

    def test_handle_critical_error(self, error_svc):
        error_svc.handle_critical_error("Op", ValueError("critical"))

    def test_handle_warning(self, error_svc):
        error_svc.handle_warning("msg", "ctx")

    def test_handle_success(self, error_svc):
        error_svc.handle_success("Op", "details")
