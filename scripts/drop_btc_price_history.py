#!/usr/bin/env python3
"""
Drop the btc_price_history table. Run this before refetching with a different
granularity (e.g. after switching from daily to weekly in fetch_btc_price_history.py).

Run from project root: ./venv/bin/python3 scripts/drop_btc_price_history.py
"""

import sys
import os

_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_script_dir)
_backend_dir = os.path.join(_project_root, "backend")
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from data_store import init_schema, drop_btc_price_history_table  # noqa: E402


def run():
    init_schema()
    drop_btc_price_history_table()
    print("Dropped btc_price_history table. Run scripts/fetch_btc_price_history.py to refill.")


if __name__ == "__main__":
    run()
