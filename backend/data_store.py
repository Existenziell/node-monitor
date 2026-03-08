#!/usr/bin/env python3
"""
SQLite store for dashboard data: blocks, network history, block stats, BTC price history.
Used by block monitor (writer) and API (reader). Thread-safe via a single lock.
"""

import os
import sqlite3
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional

try:
    from constants import DIFFICULTY_JSON_MAX_ENTRIES
except ImportError:
    DIFFICULTY_JSON_MAX_ENTRIES = 100

# Resolve data dir relative to project root (parent of backend)
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_backend_dir)
_default_db_path = os.path.join(_project_root, "data", "node_monitor.db")

_lock = threading.Lock()


def _get_connection(db_path: Optional[str] = None):
    """Open a connection (caller must hold _lock or use public API)."""
    path = db_path or _default_db_path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def init_schema(db_path: Optional[str] = None) -> None:
    """Create tables if they do not exist."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS blocks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    block_height INTEGER NOT NULL UNIQUE,
                    block_hash TEXT NOT NULL,
                    mining_pool TEXT NOT NULL,
                    transaction_count INTEGER NOT NULL,
                    block_size INTEGER NOT NULL,
                    block_weight INTEGER NOT NULL,
                    block_reward REAL NOT NULL,
                    total_fees REAL NOT NULL,
                    total_fees_usd REAL NOT NULL,
                    block_time TEXT NOT NULL,
                    time_since_last_block TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_blocks_height ON blocks(block_height DESC);

                CREATE TABLE IF NOT EXISTS network_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    block_height INTEGER NOT NULL,
                    hash_rate REAL,
                    difficulty REAL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_network_created ON network_history(created_at DESC);

                CREATE TABLE IF NOT EXISTS block_stats (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    avg_block_time_seconds REAL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS btc_price_history (
                    date TEXT NOT NULL PRIMARY KEY,
                    price_usd REAL NOT NULL,
                    created_at TEXT NOT NULL
                );
            """)
            conn.commit()
        finally:
            conn.close()


def insert_block(  # pylint: disable=R0913
    block_height: int,
    block_hash: str,
    mining_pool: str,
    transaction_count: int,
    block_size: int,
    block_weight: int,
    block_reward: float,
    total_fees: float,
    total_fees_usd: float,
    block_time: str,
    time_since_last_block: str,
    db_path: Optional[str] = None,
) -> None:
    """Insert one block. Ignores if block_height already exists."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            conn.execute(
                """
                INSERT OR IGNORE INTO blocks (
                    block_height, block_hash, mining_pool, transaction_count,
                    block_size, block_weight, block_reward, total_fees, total_fees_usd,
                    block_time, time_since_last_block, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    block_height,
                    block_hash,
                    mining_pool,
                    transaction_count,
                    block_size,
                    block_weight,
                    block_reward,
                    total_fees,
                    total_fees_usd,
                    block_time,
                    time_since_last_block or "",
                    datetime.utcnow().isoformat() + "Z",
                ),
            )
            conn.commit()
        finally:
            conn.close()


def insert_network_snapshot(
    timestamp: str,
    block_height: int,
    hash_rate: Optional[float],
    difficulty: Optional[float],
    db_path: Optional[str] = None,
) -> None:
    """Append one network history row."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            conn.execute(
                """
                INSERT INTO network_history (timestamp, block_height, hash_rate, difficulty, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    timestamp,
                    block_height,
                    hash_rate,
                    difficulty,
                    datetime.utcnow().isoformat() + "Z",
                ),
            )
            conn.commit()
            conn.execute(
                """
                DELETE FROM network_history
                WHERE id NOT IN (SELECT id FROM network_history ORDER BY id DESC LIMIT ?)
                """,
                (DIFFICULTY_JSON_MAX_ENTRIES,),
            )
            conn.commit()
        finally:
            conn.close()


def get_blocks_count(db_path: Optional[str] = None) -> int:
    """Return total number of blocks in the blocks table."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            cur = conn.execute("SELECT COUNT(*) FROM blocks")
            return int(cur.fetchone()[0])
        finally:
            conn.close()


def prune_blocks_if_over(max_count: int, db_path: Optional[str] = None) -> None:
    """If blocks table has more than max_count rows, delete oldest (by height) to keep max_count."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            cur = conn.execute("SELECT COUNT(*) FROM blocks")
            count = int(cur.fetchone()[0])
            if count <= max_count:
                return
            conn.execute(
                """
                DELETE FROM blocks
                WHERE block_height NOT IN (
                    SELECT block_height FROM blocks ORDER BY block_height DESC LIMIT ?
                )
                """,
                (max_count,),
            )
            conn.commit()
        finally:
            conn.close()


def get_recent_blocks(
    limit: int, offset: int = 0, db_path: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Return last `limit` blocks from `offset`, newest first. Same shape as former blocks.json entries."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                """
                SELECT
                    created_at AS timestamp,
                    block_height,
                    block_hash,
                    mining_pool,
                    transaction_count,
                    block_size,
                    block_weight,
                    block_reward,
                    total_fees,
                    total_fees_usd,
                    block_time,
                    time_since_last_block
                FROM blocks
                ORDER BY block_height DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset),
            )
            rows = cur.fetchall()
        finally:
            conn.close()

    out = []
    for row in rows:
        out.append({
            "timestamp": row["timestamp"],
            "block_height": row["block_height"],
            "block_hash": row["block_hash"],
            "mining_pool": row["mining_pool"],
            "transaction_count": row["transaction_count"],
            "block_size": row["block_size"],
            "block_weight": row["block_weight"],
            "block_reward": round(row["block_reward"], 8),
            "total_fees": round(row["total_fees"], 8),
            "total_fees_usd": round(row["total_fees_usd"], 2),
            "block_time": row["block_time"],
            "time_since_last_block": row["time_since_last_block"] or "",
        })
    return out


def get_network_history(limit: int, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return last `limit` network records, newest first. Same shape as difficulty.json history."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                """
                SELECT timestamp, block_height AS blockHeight, hash_rate AS hashRate, difficulty
                FROM network_history
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            )
            rows = cur.fetchall()
        finally:
            conn.close()

    out = []
    for row in rows:
        out.append({
            "timestamp": row["timestamp"],
            "blockHeight": row["blockHeight"],
            "hashRate": round(row["hashRate"], 2) if row["hashRate"] is not None else None,
            "difficulty": round(row["difficulty"], 2) if row["difficulty"] is not None else None,
        })
    return out


def drop_btc_price_history_table(db_path: Optional[str] = None) -> None:
    """Drop the btc_price_history table. Used before refetching with a different granularity."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            conn.execute("DROP TABLE IF EXISTS btc_price_history")
            conn.commit()
        finally:
            conn.close()


def insert_btc_price_history(
    entries: List[tuple],
    db_path: Optional[str] = None,
) -> None:
    """Upsert (date, price_usd) pairs into btc_price_history. Each entry is (date_str, price_float)."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            now = datetime.utcnow().isoformat() + "Z"
            for date_str, price in entries:
                conn.execute(
                    """
                    INSERT INTO btc_price_history (date, price_usd, created_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(date) DO UPDATE SET price_usd = excluded.price_usd, created_at = excluded.created_at
                    """,
                    (date_str, float(price), now),
                )
            conn.commit()
        finally:
            conn.close()


def get_btc_price_history(db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return all btc_price_history rows ordered by date ascending. Shape: [{ date, priceUsd }, ...]."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                """
                SELECT date, price_usd AS priceUsd
                FROM btc_price_history
                ORDER BY date ASC
                """
            )
            rows = cur.fetchall()
        finally:
            conn.close()

    return [{"date": row["date"], "priceUsd": round(row["priceUsd"], 2)} for row in rows]


def get_distribution(db_path: Optional[str] = None) -> Dict[str, Any]:
    """Compute pool distribution from blocks. Same shape as distribution.json."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            cur = conn.execute(
                """
                SELECT mining_pool, COUNT(*) AS cnt
                FROM blocks
                GROUP BY mining_pool
                """
            )
            rows = cur.fetchall()
            total = sum(r[1] for r in rows) or 1
            by_pool = {r[0]: r[1] for r in rows}
            by_percentage = {p: round(c * 100.0 / total, 2) for p, c in by_pool.items()}
        finally:
            conn.close()

    return {
        "updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "blocks_count": sum(by_pool.values()),
        "by_pool": by_pool,
        "by_percentage": by_percentage,
    }


def _compute_avg_block_time_from_times(block_times: List[str]) -> Optional[float]:
    """Compute average block time in seconds from block_time UTC strings (%Y-%m-%d %H:%M:%S)."""
    times = []
    for ts in block_times:
        if not ts or not isinstance(ts, str):
            continue
        try:
            dt = datetime.strptime(ts, "%Y-%m-%d %H:%M:%S")
            times.append(dt.timestamp())
        except (TypeError, ValueError):
            continue
    if len(times) < 2:
        return None
    times.sort()
    deltas = []
    for i in range(1, len(times)):
        if times[i] > times[i - 1]:
            deltas.append(times[i] - times[i - 1])
    if not deltas:
        return None
    return sum(deltas) / len(deltas)


def update_avg_block_time(max_blocks: int, db_path: Optional[str] = None) -> None:
    """Recompute average block time from the last max_blocks blocks and store in block_stats."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            cur = conn.execute(
                """
                SELECT block_time FROM blocks
                ORDER BY block_height DESC
                LIMIT ?
                """,
                (max_blocks,),
            )
            rows = cur.fetchall()
            block_times = [r[0] for r in rows if r[0]]
            avg = _compute_avg_block_time_from_times(block_times)
            if avg is None:
                return
            updated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            conn.execute(
                """
                INSERT OR REPLACE INTO block_stats (id, avg_block_time_seconds, updated_at)
                VALUES (1, ?, ?)
                """,
                (round(avg, 2), updated_at),
            )
            conn.commit()
        finally:
            conn.close()


def get_avg_block_time(db_path: Optional[str] = None) -> Optional[float]:
    """Return stored average block time in seconds, or None if not yet computed."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            cur = conn.execute(
                "SELECT avg_block_time_seconds FROM block_stats WHERE id = 1"
            )
            row = cur.fetchone()
            if row is None or row[0] is None:
                return None
            return float(row[0])
        finally:
            conn.close()


def get_last_logged_block_height(db_path: Optional[str] = None) -> int:
    """Return the highest block_height in blocks table, or 0."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            cur = conn.execute("SELECT COALESCE(MAX(block_height), 0) FROM blocks")
            return int(cur.fetchone()[0])
        finally:
            conn.close()


def prune_blocks(keep_count: int, db_path: Optional[str] = None) -> None:
    """Keep only the most recent keep_count blocks. Call periodically if desired."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            conn.execute(
                """
                DELETE FROM blocks
                WHERE block_height NOT IN (
                    SELECT block_height FROM blocks ORDER BY block_height DESC LIMIT ?
                )
                """,
                (keep_count,),
            )
            conn.commit()
        finally:
            conn.close()


def prune_network_history(keep_count: int, db_path: Optional[str] = None) -> None:
    """Keep only the most recent keep_count network_history rows."""
    with _lock:
        conn = _get_connection(db_path)
        try:
            conn.execute(
                """
                DELETE FROM network_history
                WHERE id NOT IN (SELECT id FROM network_history ORDER BY id DESC LIMIT ?)
                """,
                (keep_count,),
            )
            conn.commit()
        finally:
            conn.close()
