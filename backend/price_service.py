#!/usr/bin/env python3
"""
Price Service
Centralized service for fetching Bitcoin price data with caching and rate limiting
"""

import time
import threading
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any

import requests
import yfinance as yf

from constants import COINGECKO_API_URL, DEFAULT_API_TIMEOUT, MAX_RETRY_ATTEMPTS, RETRY_BASE_DELAY


@dataclass
class PriceData:
    """Container for price data with metadata."""
    price: float
    timestamp: datetime
    source: str
    currency: str = "USD"


class PriceService:
    """Centralized service for Bitcoin price data with caching and rate limiting."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        """Singleton pattern to ensure only one instance exists."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize the price service."""
        if hasattr(self, '_initialized'):
            return

        self._initialized = True
        self._cache: Dict[str, PriceData] = {}
        self._last_fetch_time = 0
        self._min_fetch_interval = 10  # Minimum 10 seconds between API calls
        self._cache_duration = 600  # Cache valid for 10 minutes
        self._lock = threading.Lock()

        # API endpoints and their priorities
        self._apis = [
            {
                'name': 'CoinGecko',
                'url': f'{COINGECKO_API_URL}?ids=bitcoin&vs_currencies=usd',
                'parser': self._parse_coingecko_response,
                'timeout': 5
            },
            {
                'name': 'Yahoo Finance',
                'url': 'BTC-USD',
                'parser': self._parse_yfinance_response,
                'timeout': 10
            }
        ]

    def get_current_price(self, force_refresh: bool = False) -> Optional[float]:
        """
        Get current Bitcoin price in USD.

        Args:
            force_refresh: If True, bypass cache and fetch fresh data

        Returns:
            Current Bitcoin price in USD, or None if unavailable
        """
        with self._lock:
            current_time = time.time()

            if not force_refresh and 'current' in self._cache:
                cached_data = self._cache['current']
                if (current_time - cached_data.timestamp.timestamp()) < self._cache_duration:
                    return cached_data.price

            if current_time - self._last_fetch_time < self._min_fetch_interval:
                if 'current' in self._cache:
                    return self._cache['current'].price
                return None

            price_data = self._fetch_price_data()
            if price_data:
                self._cache['current'] = price_data
                self._last_fetch_time = current_time
                return price_data.price

            if 'current' in self._cache:
                return self._cache['current'].price

            return None

    def get_historical_data(self, start_date: str, end_date: str = None) -> Optional[Any]:
        """
        Get historical Bitcoin price data.

        Args:
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format (defaults to today)

        Returns:
            Historical price data or None if unavailable
        """
        if end_date is None:
            end_date = datetime.now().strftime('%Y-%m-%d')

        cache_key = f"historical_{start_date}_{end_date}"

        with self._lock:
            if cache_key in self._cache:
                cached_data = self._cache[cache_key]
                if (time.time() - cached_data.timestamp.timestamp()) < self._cache_duration:
                    return cached_data.price

            try:
                data = yf.download('BTC-USD',
                                 start=start_date,
                                 end=end_date,
                                 auto_adjust=True,
                                 progress=False)

                if data is not None and not data.empty:
                    self._cache[cache_key] = PriceData(
                        price=data,
                        timestamp=datetime.now(),
                        source='Yahoo Finance',
                        currency='USD'
                    )
                    return data
            except (ValueError, ConnectionError, TimeoutError) as e:
                print(f"Warning: Failed to fetch historical data: {e}")

            return None

    def _fetch_price_data(self) -> Optional[PriceData]:
        """Fetch current price data from available APIs with retry logic."""
        for api in self._apis:
            try:
                if api['name'] == 'CoinGecko':
                    for attempt in range(MAX_RETRY_ATTEMPTS):
                        try:
                            response = requests.get(api['url'], timeout=api.get('timeout', DEFAULT_API_TIMEOUT))
                            if response.status_code == 200:
                                data = api['parser'](response.json())
                                if data:
                                    return PriceData(
                                        price=data,
                                        timestamp=datetime.now(),
                                        source=api['name'],
                                        currency='USD'
                                    )
                        except (requests.RequestException, ConnectionError, TimeoutError) as e:
                            if attempt < MAX_RETRY_ATTEMPTS - 1:
                                delay = RETRY_BASE_DELAY * (2 ** attempt)
                                print(f"Warning: {api['name']} API attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                                time.sleep(delay)
                                continue
                            print(f"Warning: {api['name']} API failed after {MAX_RETRY_ATTEMPTS} attempts: {e}")
                            break
                elif api['name'] == 'Yahoo Finance':
                    for attempt in range(MAX_RETRY_ATTEMPTS):
                        try:
                            ticker = yf.Ticker(api['url'])
                            data = ticker.history(period='1d', interval='1m')
                            if not data.empty:
                                latest_price = data['Close'].iloc[-1]
                                return PriceData(
                                    price=float(latest_price),
                                    timestamp=datetime.now(),
                                    source=api['name'],
                                    currency='USD'
                                )
                        except (ValueError, ConnectionError, TimeoutError) as e:
                            if attempt < MAX_RETRY_ATTEMPTS - 1:
                                delay = RETRY_BASE_DELAY * (2 ** attempt)
                                print(f"Warning: {api['name']} API attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                                time.sleep(delay)
                                continue
                            print(f"Warning: {api['name']} API failed after {MAX_RETRY_ATTEMPTS} attempts: {e}")
                            break
            except Exception as e:
                print(f"Warning: {api['name']} API failed: {e}")
                continue

        return None

    def _parse_coingecko_response(self, response_data: Dict[str, Any]) -> Optional[float]:
        """Parse CoinGecko API response."""
        try:
            return response_data.get('bitcoin', {}).get('usd')
        except (KeyError, TypeError):
            return None

    def _parse_yfinance_response(self, response_data: Any) -> Optional[float]:
        """Parse Yahoo Finance response."""
        try:
            if hasattr(response_data, 'iloc') and not response_data.empty:
                return float(response_data['Close'].iloc[-1])
            return None
        except (IndexError, KeyError, TypeError):
            return None

    def get_cache_info(self) -> Dict[str, Any]:
        """Get information about cached data."""
        with self._lock:
            current_time = time.time()
            last_fetch_str = (datetime.fromtimestamp(self._last_fetch_time)
                             .strftime('%Y-%m-%d %H:%M:%S')
                             if self._last_fetch_time > 0 else 'Never')
            next_fetch_str = (datetime.fromtimestamp(
                self._last_fetch_time + self._min_fetch_interval)
                .strftime('%Y-%m-%d %H:%M:%S')
                if self._last_fetch_time > 0 else 'Now')

            cache_info = {
                'cached_entries': len(self._cache),
                'last_fetch': last_fetch_str,
                'next_allowed_fetch': next_fetch_str,
                'cache_duration_seconds': self._cache_duration,
                'min_fetch_interval_seconds': self._min_fetch_interval
            }

            if 'current' in self._cache:
                current_data = self._cache['current']
                cache_info['current_price'] = current_data.price
                cache_info['current_source'] = current_data.source
                cache_info['current_timestamp'] = current_data.timestamp.strftime(
                    '%Y-%m-%d %H:%M:%S')
                cache_info['current_age_seconds'] = (current_time -
                                                    current_data.timestamp.timestamp())

            return cache_info

    def clear_cache(self) -> None:
        """Clear all cached data."""
        with self._lock:
            self._cache.clear()
            self._last_fetch_time = 0

    def set_rate_limit(self, min_interval_seconds: int) -> None:
        """Set minimum interval between API calls."""
        with self._lock:
            self._min_fetch_interval = min_interval_seconds

    def set_cache_duration(self, duration_seconds: int) -> None:
        """Set cache duration in seconds."""
        with self._lock:
            self._cache_duration = duration_seconds

    def get_optimal_settings_for_monitoring(self) -> Dict[str, Any]:
        """Get recommended cache settings for monitoring applications."""
        return {
            'cache_duration_seconds': 600,  # 10 minutes
            'min_fetch_interval_seconds': 10,  # 10 seconds
            'reasoning': ('Bitcoin price changes slowly, 10min cache with '
                         '10s rate limit is optimal for monitoring')
        }


price_service = PriceService()


def get_bitcoin_price(force_refresh: bool = False) -> Optional[float]:
    """
    Convenience function to get current Bitcoin price.

    Args:
        force_refresh: If True, bypass cache and fetch fresh data

    Returns:
        Current Bitcoin price in USD, or None if unavailable
    """
    return price_service.get_current_price(force_refresh)


def get_historical_bitcoin_data(start_date: str, end_date: str = None) -> Optional[Any]:
    """
    Convenience function to get historical Bitcoin data.

    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format (defaults to today)

    Returns:
        Historical price data or None if unavailable
    """
    return price_service.get_historical_data(start_date, end_date)


def get_price_cache_info() -> Dict[str, Any]:
    """Get information about the price cache."""
    return price_service.get_cache_info()


def clear_price_cache() -> None:
    """Clear the price cache."""
    price_service.clear_cache()
