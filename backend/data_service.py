#!/usr/bin/env python3
"""
Data Service
Centralized service for Bitcoin data processing, calculations, and analytics
"""

import time
from typing import Dict, Any, Optional, List, Union


class DataService:
    """Centralized service for Bitcoin data processing and analytics."""

    def __init__(self):
        """Initialize the data service."""

    def get_bitcoin_price(self, force_refresh: bool = False) -> Optional[float]:
        """Get current Bitcoin price in USD using centralized price service."""
        from price_service import get_bitcoin_price as get_price
        return get_price(force_refresh)

    def calculate_time_since(self, timestamp: int) -> str:
        """Calculate time since a timestamp."""
        current_time = int(time.time())
        diff = current_time - timestamp
        return self._format_duration(diff)

    def safe_get(self, data: Dict[str, Any], key: str, default: Any = None) -> Any:
        """Safely get a value from a dictionary with error handling."""
        try:
            return data.get(key, default)
        except (KeyError, TypeError):
            return default

    def extract_result(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract result from RPC response with error handling."""
        if "error" in data and data["error"]:
            return None
        return data.get("result")

    def calculate_block_time(self, current_height: int, previous_height: int,
                           current_time: int, previous_time: int) -> float:
        """Calculate average block time between two blocks."""
        if current_height <= previous_height:
            return 0.0

        height_diff = current_height - previous_height
        time_diff = current_time - previous_time

        if time_diff <= 0:
            return 0.0

        return time_diff / height_diff

    def calculate_hashrate_from_difficulty(self, difficulty: float, block_time: float = 600) -> float:
        """Calculate network hashrate from difficulty and block time."""
        if difficulty <= 0 or block_time <= 0:
            return 0.0

        # Hashrate = difficulty * 2^32 / block_time
        return (difficulty * (2 ** 32)) / block_time

    def calculate_mempool_fee_rate(self, mempool_size: int, fee_rate: float) -> Dict[str, float]:
        """Calculate mempool fee statistics."""
        if mempool_size <= 0:
            return {"low": 0.0, "medium": 0.0, "high": 0.0}

        # Simple fee rate calculation (can be enhanced with more sophisticated logic)
        base_rate = fee_rate / 1000  # Convert to BTC per KB

        return {
            "low": base_rate * 0.5,
            "medium": base_rate,
            "high": base_rate * 2.0
        }

    def calculate_wallet_balance_usd(self, btc_balance: float, btc_price: Optional[float] = None) -> Optional[float]:
        """Calculate wallet balance in USD."""
        if btc_price is None:
            btc_price = self.get_bitcoin_price()

        if btc_price is None:
            return None

        return btc_balance * btc_price

    def calculate_transaction_fee(self, tx_size: int, fee_rate: float) -> float:
        """Calculate transaction fee in BTC."""
        return (tx_size / 1000) * fee_rate  # fee_rate in BTC per KB

    def calculate_block_weight(self, tx_count: int, avg_tx_size: int = 250) -> int:
        """Estimate block weight based on transaction count."""
        return tx_count * avg_tx_size

    def calculate_network_throughput(self, block_size: int, block_time: float) -> float:
        """Calculate network throughput in transactions per second."""
        if block_time <= 0:
            return 0.0

        # Assuming average transaction size of 250 bytes
        avg_tx_size = 250
        tx_per_block = block_size / avg_tx_size
        return tx_per_block / block_time

    def analyze_block_data(self, block_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze block data and extract key metrics."""
        if not block_data:
            return {}

        analysis = {
            "height": self.safe_get(block_data, "height", 0),
            "hash": self.safe_get(block_data, "hash", ""),
            "time": self.safe_get(block_data, "time", 0),
            "size": self.safe_get(block_data, "size", 0),
            "weight": self.safe_get(block_data, "weight", 0),
            "tx_count": len(self.safe_get(block_data, "tx", [])),
            "difficulty": self.safe_get(block_data, "difficulty", 0),
            "nonce": self.safe_get(block_data, "nonce", 0)
        }

        # Calculate additional metrics
        if analysis["size"] > 0 and analysis["tx_count"] > 0:
            analysis["avg_tx_size"] = analysis["size"] / analysis["tx_count"]

        if analysis["weight"] > 0:
            analysis["weight_ratio"] = analysis["size"] / analysis["weight"]

        return analysis

    def analyze_mempool_data(self, mempool_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze mempool data and extract key metrics."""
        if not mempool_data:
            return {}

        analysis = {
            "size": self.safe_get(mempool_data, "size", 0),
            "bytes": self.safe_get(mempool_data, "bytes", 0),
            "usage": self.safe_get(mempool_data, "usage", 0),
            "maxmempool": self.safe_get(mempool_data, "maxmempool", 0)
        }

        # Calculate utilization percentage
        if analysis["maxmempool"] > 0:
            analysis["utilization_percent"] = (analysis["usage"] / analysis["maxmempool"]) * 100

        # Estimate transaction count
        if analysis["bytes"] > 0:
            analysis["estimated_tx_count"] = analysis["bytes"] / 250  # Assuming 250 bytes per tx

        return analysis

    def format_number(self, number: Union[int, float], decimals: int = 2) -> str:
        """Format number with appropriate units (K, M, B, T)."""
        if number < 1000:
            return f"{number:.{decimals}f}"
        if number < 1000000:
            return f"{number/1000:.{decimals}f}K"
        if number < 1000000000:
            return f"{number/1000000:.{decimals}f}M"
        if number < 1000000000000:
            return f"{number/1000000000:.{decimals}f}B"
        return f"{number/1000000000000:.{decimals}f}T"

    def calculate_percentage_change(self, old_value: float, new_value: float) -> float:
        """Calculate percentage change between two values."""
        if old_value == 0:
            return 0.0
        return ((new_value - old_value) / old_value) * 100

    def calculate_moving_average(self, values: List[float], window: int) -> List[float]:
        """Calculate moving average for a list of values."""
        if len(values) < window:
            return []

        moving_avg = []
        for i in range(window - 1, len(values)):
            avg = sum(values[i - window + 1:i + 1]) / window
            moving_avg.append(avg)

        return moving_avg

    def detect_anomalies(self, values: List[float], threshold: float = 2.0) -> List[int]:
        """Detect anomalies in a list of values using standard deviation."""
        if len(values) < 3:
            return []

        import statistics
        mean = statistics.mean(values)
        stdev = statistics.stdev(values)

        anomalies = []
        for i, value in enumerate(values):
            if abs(value - mean) > threshold * stdev:
                anomalies.append(i)

        return anomalies

    def _format_duration(self, seconds: int) -> str:
        """Format duration in seconds to human readable format."""
        if seconds < 60:
            return f"{seconds}s"
        if seconds < 3600:
            return f"{seconds // 60}m {seconds % 60}s"
        if seconds < 86400:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            return f"{hours}h {minutes}m"
        days = seconds // 86400
        hours = (seconds % 86400) // 3600
        return f"{days}d {hours}h"


# Global instance for easy access
data_service = DataService()


# Convenience functions for backward compatibility
def get_bitcoin_price() -> Optional[float]:
    """Get current Bitcoin price (convenience function)."""
    return data_service.get_bitcoin_price()


def calculate_time_since(timestamp: int) -> str:
    """Calculate time since timestamp (convenience function)."""
    return data_service.calculate_time_since(timestamp)


def safe_get(data: Dict[str, Any], key: str, default: Any = None) -> Any:
    """Safely get value from dictionary (convenience function)."""
    return data_service.safe_get(data, key, default)


def extract_result(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract result from RPC response (convenience function)."""
    return data_service.extract_result(data)
