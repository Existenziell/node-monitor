"""Tests for block_store (SQLite blocks/network/distribution)."""

import os

from block_store import (
    get_distribution,
    get_last_logged_block_height,
    get_network_history,
    get_recent_blocks,
    init_schema,
    insert_block,
    insert_network_snapshot,
)


def _db_path(tmp_path):
    """Return path to a temporary SQLite DB under tmp_path/data."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    return str(data_dir / "node_monitor.db")


def test_init_schema(tmp_path):
    """init_schema creates tables and does not raise."""
    path = _db_path(tmp_path)
    init_schema(path)
    assert os.path.isfile(path)


def test_insert_block_and_get_recent_blocks(tmp_path):
    """insert_block persists a block; get_recent_blocks returns it."""
    path = _db_path(tmp_path)
    init_schema(path)
    insert_block(
        block_height=100,
        block_hash="abc123",
        mining_pool="TestPool",
        transaction_count=1,
        block_size=1000,
        block_weight=4000,
        block_reward=6.25,
        total_fees=0.01,
        total_fees_usd=500.0,
        block_time="2025-01-01 12:00:00",
        time_since_last_block="10m",
        db_path=path,
    )
    blocks = get_recent_blocks(10, path)
    assert len(blocks) == 1
    assert blocks[0]["block_height"] == 100
    assert blocks[0]["block_hash"] == "abc123"
    assert blocks[0]["mining_pool"] == "TestPool"
    assert blocks[0]["total_fees"] == 0.01
    assert blocks[0]["block_time"] == "2025-01-01 12:00:00"


def test_insert_network_snapshot_and_get_network_history(tmp_path):
    """insert_network_snapshot persists a row; get_network_history returns it."""
    path = _db_path(tmp_path)
    init_schema(path)
    insert_network_snapshot(
        timestamp="2025-01-01 12:00:00",
        block_height=100,
        hash_rate=500.0,
        difficulty=70.0,
        db_path=path,
    )
    history = get_network_history(10, path)
    assert len(history) == 1
    assert history[0]["blockHeight"] == 100
    assert history[0]["hashRate"] == 500.0
    assert history[0]["difficulty"] == 70.0
    assert history[0]["timestamp"] == "2025-01-01 12:00:00"


def test_get_distribution(tmp_path):
    """get_distribution returns pool counts and percentages from blocks."""
    path = _db_path(tmp_path)
    init_schema(path)
    for height, pool in [(100, "PoolA"), (101, "PoolA"), (102, "PoolB")]:
        insert_block(
            block_height=height,
            block_hash=f"hash_{height}",
            mining_pool=pool,
            transaction_count=1,
            block_size=1000,
            block_weight=4000,
            block_reward=6.25,
            total_fees=0.0,
            total_fees_usd=0.0,
            block_time="2025-01-01 12:00:00",
            time_since_last_block="10m",
            db_path=path,
        )
    dist = get_distribution(path)
    assert dist["blocks_count"] == 3
    assert dist["by_pool"] == {"PoolA": 2, "PoolB": 1}
    assert dist["by_percentage"]["PoolA"] == 66.67
    assert dist["by_percentage"]["PoolB"] == 33.33


def test_get_last_logged_block_height(tmp_path):
    """get_last_logged_block_height returns 0 when empty, max height when not."""
    path = _db_path(tmp_path)
    init_schema(path)
    assert get_last_logged_block_height(path) == 0
    insert_block(
        block_height=200,
        block_hash="xyz",
        mining_pool="X",
        transaction_count=0,
        block_size=0,
        block_weight=0,
        block_reward=0.0,
        total_fees=0.0,
        total_fees_usd=0.0,
        block_time="2025-01-01 12:00:00",
        time_since_last_block="",
        db_path=path,
    )
    assert get_last_logged_block_height(path) == 200
