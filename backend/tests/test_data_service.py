"""
Tests for data_service: calculations, safe_get, extract_result, formatting, analysis.
"""
# pylint: disable=redefined-outer-name
import time
from unittest.mock import patch

import pytest

from data_service import (
    DataService,
    safe_get,
    extract_result,
    calculate_time_since,
)


@pytest.fixture
def svc():
    """Fresh DataService instance for isolation."""
    return DataService()


class TestDataServiceSafeGet:
    """Tests for safe_get / DataService.safe_get."""

    def test_safe_get_existing_key(self, svc):
        assert svc.safe_get({"a": 1}, "a") == 1
        assert safe_get({"a": 1}, "a") == 1

    def test_safe_get_missing_key_returns_default(self, svc):
        assert svc.safe_get({"a": 1}, "b") is None
        assert svc.safe_get({"a": 1}, "b", 0) == 0
        assert safe_get({"a": 1}, "b", "x") == "x"

    def test_safe_get_none_data_returns_default(self, svc):
        assert svc.safe_get(None, "k", "default") == "default"

    def test_safe_get_non_dict_returns_default(self, svc):
        assert svc.safe_get("not a dict", "k", 42) == 42


class TestDataServiceExtractResult:
    """Tests for extract_result / DataService.extract_result."""

    def test_extract_result_success(self, svc):
        data = {"result": {"blocks": 800000}, "error": None}
        assert svc.extract_result(data) == {"blocks": 800000}
        assert extract_result(data) == {"blocks": 800000}

    def test_extract_result_with_error_returns_none(self, svc):
        data = {"result": None, "error": {"message": "RPC failed", "code": -1}}
        assert svc.extract_result(data) is None
        assert extract_result(data) is None

    def test_extract_result_no_result_key_returns_none(self, svc):
        assert svc.extract_result({}) is None
        assert extract_result({"error": None}) is None


class TestDataServiceBlockTime:
    """Tests for calculate_block_time."""

    def test_block_time_normal(self, svc):
        assert svc.calculate_block_time(100, 90, 1000, 400) == 60.0

    def test_block_time_current_lte_previous_returns_zero(self, svc):
        assert svc.calculate_block_time(100, 100, 1000, 900) == 0.0
        assert svc.calculate_block_time(90, 100, 1000, 900) == 0.0

    def test_block_time_non_positive_time_diff_returns_zero(self, svc):
        assert svc.calculate_block_time(100, 90, 400, 400) == 0.0
        assert svc.calculate_block_time(100, 90, 300, 400) == 0.0


class TestDataServiceHashrate:
    """Tests for calculate_hashrate_from_difficulty."""

    def test_hashrate_normal(self, svc):
        expected = (2 ** 32) / 600
        assert svc.calculate_hashrate_from_difficulty(1.0, 600) == expected

    def test_hashrate_zero_difficulty_returns_zero(self, svc):
        assert svc.calculate_hashrate_from_difficulty(0, 600) == 0.0

    def test_hashrate_zero_block_time_returns_zero(self, svc):
        assert svc.calculate_hashrate_from_difficulty(1.0, 0) == 0.0


class TestDataServiceMempoolFeeRate:
    """Tests for calculate_mempool_fee_rate."""

    def test_mempool_fee_rate_normal(self, svc):
        out = svc.calculate_mempool_fee_rate(1000, 5000.0)
        assert out["low"] == 2.5
        assert out["medium"] == 5.0
        assert out["high"] == 10.0

    def test_mempool_fee_rate_zero_size_returns_zeros(self, svc):
        out = svc.calculate_mempool_fee_rate(0, 100.0)
        assert out == {"low": 0.0, "medium": 0.0, "high": 0.0}


class TestDataServiceWalletBalanceUsd:
    """Tests for calculate_wallet_balance_usd."""

    def test_wallet_balance_usd_with_price(self, svc):
        assert svc.calculate_wallet_balance_usd(1.0, 50000.0) == 50000.0
        assert svc.calculate_wallet_balance_usd(0.5, 40000.0) == 20000.0

    def test_wallet_balance_usd_none_price_returns_none(self, svc):
        with patch.object(svc, "get_bitcoin_price", return_value=None):
            assert svc.calculate_wallet_balance_usd(1.0, None) is None


class TestDataServiceTransactionFee:
    """Tests for calculate_transaction_fee."""

    def test_transaction_fee(self, svc):
        assert svc.calculate_transaction_fee(250, 10.0) == 2.5


class TestDataServiceBlockWeight:
    """Tests for calculate_block_weight."""

    def test_block_weight_default_avg_tx_size(self, svc):
        assert svc.calculate_block_weight(100) == 100 * 250

    def test_block_weight_custom_avg_tx_size(self, svc):
        assert svc.calculate_block_weight(50, 300) == 15000


class TestDataServiceNetworkThroughput:
    """Tests for calculate_network_throughput."""

    def test_throughput_normal(self, svc):
        result = svc.calculate_network_throughput(1_000_000, 600.0)
        assert abs(result - (1_000_000 / 250 / 600)) < 0.01

    def test_throughput_zero_block_time_returns_zero(self, svc):
        assert svc.calculate_network_throughput(1000, 0) == 0.0


class TestDataServiceAnalyzeBlockData:
    """Tests for analyze_block_data."""

    def test_analyze_block_data_empty_returns_empty_dict(self, svc):
        assert svc.analyze_block_data({}) == {}
        assert svc.analyze_block_data(None) == {}

    def test_analyze_block_data_extracts_fields(self, svc, sample_block):
        analysis = svc.analyze_block_data(sample_block)
        assert analysis["height"] == 800000
        assert analysis["hash"] == sample_block["hash"]
        assert analysis["time"] == 1600000000
        assert analysis["tx_count"] == 2
        assert analysis["difficulty"] == 20000000000000

    def test_analyze_block_data_computes_avg_tx_size_and_weight_ratio(self, svc, sample_block):
        analysis = svc.analyze_block_data(sample_block)
        assert analysis["avg_tx_size"] == 1250000 / 2
        assert analysis["weight_ratio"] == 1250000 / 4000000


class TestDataServiceAnalyzeMempoolData:
    """Tests for analyze_mempool_data."""

    def test_analyze_mempool_empty_returns_empty_dict(self, svc):
        assert svc.analyze_mempool_data({}) == {}
        assert svc.analyze_mempool_data(None) == {}

    def test_analyze_mempool_extracts_and_computes(self, svc, sample_mempool):
        analysis = svc.analyze_mempool_data(sample_mempool)
        assert analysis["size"] == 5000
        assert analysis["bytes"] == 2000000
        assert analysis["maxmempool"] == 300000000
        assert "utilization_percent" in analysis
        assert analysis["estimated_tx_count"] == 2000000 / 250


class TestDataServiceFormatNumber:
    """Tests for format_number."""

    def test_format_small(self, svc):
        assert svc.format_number(999) == "999.00"
        assert svc.format_number(100, decimals=0) == "100"

    def test_format_k(self, svc):
        assert svc.format_number(1500) == "1.50K"
        assert svc.format_number(999_000) == "999.00K"

    def test_format_m(self, svc):
        assert svc.format_number(1_500_000) == "1.50M"

    def test_format_b(self, svc):
        assert svc.format_number(1_200_000_000) == "1.20B"

    def test_format_t(self, svc):
        assert svc.format_number(2_000_000_000_000) == "2.00T"


class TestDataServicePercentageChange:
    """Tests for calculate_percentage_change."""

    def test_percentage_change(self, svc):
        assert svc.calculate_percentage_change(100, 120) == 20.0
        assert svc.calculate_percentage_change(100, 80) == -20.0

    def test_percentage_change_old_zero_returns_zero(self, svc):
        assert svc.calculate_percentage_change(0, 100) == 0.0


class TestDataServiceMovingAverage:
    """Tests for calculate_moving_average."""

    def test_moving_average_window_3(self, svc):
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        result = svc.calculate_moving_average(values, 3)
        assert result == [2.0, 3.0, 4.0]

    def test_moving_average_insufficient_values_returns_empty(self, svc):
        assert svc.calculate_moving_average([1, 2], 3) == []


class TestDataServiceDetectAnomalies:
    """Tests for detect_anomalies."""

    def test_detect_anomalies_few_values_returns_empty(self, svc):
        assert svc.detect_anomalies([1, 2]) == []

    def test_detect_anomalies_identifies_outlier(self, svc):
        # 1000 is far from mean ~202; use threshold 1.0 so it is flagged
        values = [1.0, 2.0, 3.0, 1000.0, 2.0]
        indices = svc.detect_anomalies(values, threshold=1.0)
        assert 3 in indices


class TestCalculateTimeSince:
    """Tests for calculate_time_since (convenience) and _format_duration."""

    def test_calculate_time_since_seconds(self, svc):
        now = int(time.time())
        assert "s" in svc.calculate_time_since(now - 30)
        assert "s" in calculate_time_since(now - 30) or "m" in calculate_time_since(now - 30)

    def test_calculate_time_since_minutes(self, svc):
        now = int(time.time())
        assert "m" in svc.calculate_time_since(now - 120)
