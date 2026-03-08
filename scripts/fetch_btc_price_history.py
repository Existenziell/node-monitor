#!/usr/bin/env python3
"""
One-off (or occasional) script to fetch BTC price history and persist to SQLite.
Uses Yahoo Finance via yfinance (no API key). Aggregates to one point per week
(last trading day of each week) and upserts into data_store.btc_price_history.

Data range: Yahoo Finance BTC-USD from ~Sept 2014 to present.

To reset and refill: run scripts/drop_btc_price_history.py then this script.

Run from project root: ./venv/bin/python3 scripts/fetch_btc_price_history.py
"""

import sys
import os
import math
from collections import defaultdict
from datetime import datetime as dt

# Project root = parent of scripts/
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_script_dir)
_backend_dir = os.path.join(_project_root, "backend")
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from data_store import init_schema, get_btc_price_history, insert_btc_price_history  # noqa: E402

try:
    import yfinance as yf
except ImportError:
    print("yfinance is required. Install with: pip install yfinance")
    sys.exit(1)


def run():
    init_schema()
    print("Fetching BTC-USD history from Yahoo Finance (period=max)...")
    df = yf.download(
        "BTC-USD",
        period="max",
        interval="1d",
        auto_adjust=True,
        progress=False,
        threads=False,
    )
    if df is None or df.empty:
        print("No price data returned from Yahoo Finance.")
        sys.exit(1)

    # yfinance can return MultiIndex columns (e.g. ('Close', 'BTC-USD')) or plain 'Close'
    if "Close" in df.columns:
        close_series = df["Close"].iloc[:, 0] if df["Close"].ndim > 1 else df["Close"]
    else:
        close_col = next((c for c in df.columns if (c if isinstance(c, str) else c[0]) == "Close"), None)
        if close_col is None:
            print("DataFrame has no 'Close' column:", list(df.columns))
            sys.exit(1)
        close_series = df[close_col]

    # Single column Series: index = date, value = close price
    if close_series.ndim > 1:
        close_series = close_series.iloc[:, 0]
    close_series = close_series.dropna()

    # Build (date, price) list and group by week; keep last day of each week (close price)
    daily = []
    for date in close_series.index:
        try:
            price = float(close_series.loc[date])
            if price <= 0 or not math.isfinite(price):
                continue
            date_str = date.strftime("%Y-%m-%d") if hasattr(date, "strftime") else str(date)[:10]
            daily.append((date_str, price))
        except (TypeError, ValueError):
            continue

    if not daily:
        print("No valid price rows in DataFrame.")
        sys.exit(1)

    # One point per week: for each (year, week) take the last day's (date, price)
    by_week = defaultdict(list)
    for date_str, price in daily:
        try:
            d = dt.strptime(date_str, "%Y-%m-%d")
            year_week = (d.year, d.isocalendar().week)
            by_week[year_week].append((date_str, price))
        except (ValueError, TypeError):
            continue

    weekly_prices = []
    for year_week in sorted(by_week.keys()):
        # last day of the week (by date string)
        points = sorted(by_week[year_week], key=lambda x: x[0])
        date_str, price = points[-1]
        weekly_prices.append((date_str, price))

    if not weekly_prices:
        print("No weekly aggregates.")
        sys.exit(1)

    insert_btc_price_history(weekly_prices)
    count = len(get_btc_price_history())
    print(f"Upserted {len(weekly_prices)} weeks; total in DB: {count}")


if __name__ == "__main__":
    run()
