"""Tests for data_store (SQLite blocks/network/distribution/price history)."""

import os

from data_store import (
    get_avg_block_time,
    get_blocks_count,
    get_distribution,
    get_last_logged_block_height,
    get_network_history,
    get_recent_blocks,
    init_schema,
    insert_block,
    insert_network_snapshot,
    prune_blocks_if_over,
    update_avg_block_time,
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
    blocks = get_recent_blocks(10, db_path=path)
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


def test_get_blocks_count(tmp_path):
    """get_blocks_count returns 0 when empty and total count otherwise."""
    path = _db_path(tmp_path)
    init_schema(path)
    assert get_blocks_count(path) == 0
    for i in range(3):
        insert_block(
            block_height=100 + i,
            block_hash=f"h{i}",
            mining_pool="P",
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
    assert get_blocks_count(path) == 3


def test_get_recent_blocks_with_offset(tmp_path):
    """get_recent_blocks(limit, offset) returns correct slice."""
    path = _db_path(tmp_path)
    init_schema(path)
    for i in range(5):
        insert_block(
            block_height=100 + i,
            block_hash=f"h{i}",
            mining_pool="P",
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
    # Newest first: 104, 103, 102, 101, 100
    first_two = get_recent_blocks(2, 0, path)
    assert len(first_two) == 2
    assert first_two[0]["block_height"] == 104
    assert first_two[1]["block_height"] == 103
    next_two = get_recent_blocks(2, 2, path)
    assert len(next_two) == 2
    assert next_two[0]["block_height"] == 102
    assert next_two[1]["block_height"] == 101


def test_insert_block_does_not_prune(tmp_path):
    """insert_block no longer deletes; count can exceed cap until prune_blocks_if_over is called."""
    path = _db_path(tmp_path)
    init_schema(path)
    for i in range(501):
        insert_block(
            block_height=1000 + i,
            block_hash=f"hash_{i}",
            mining_pool="P",
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
    assert get_blocks_count(path) == 501
    prune_blocks_if_over(500, path)
    assert get_blocks_count(path) == 500
    # Oldest (1000) should be gone
    blocks = get_recent_blocks(500, 0, path)
    assert len(blocks) == 500
    heights = {b["block_height"] for b in blocks}
    assert 1000 not in heights
    assert 1500 in heights


def test_get_avg_block_time_and_update_avg_block_time(tmp_path):
    """get_avg_block_time returns None when not set; update_avg_block_time stores avg over last N blocks."""
    path = _db_path(tmp_path)
    init_schema(path)
    assert get_avg_block_time(path) is None
    insert_block(
        block_height=1,
        block_hash="a",
        mining_pool="P",
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
    update_avg_block_time(500, path)
    assert get_avg_block_time(path) is None  # need at least 2 blocks
    insert_block(
        block_height=2,
        block_hash="b",
        mining_pool="P",
        transaction_count=0,
        block_size=0,
        block_weight=0,
        block_reward=0.0,
        total_fees=0.0,
        total_fees_usd=0.0,
        block_time="2025-01-01 12:10:00",  # 600 s later
        time_since_last_block="",
        db_path=path,
    )
    update_avg_block_time(500, path)
    avg = get_avg_block_time(path)
    assert avg is not None
    assert 590 <= avg <= 610
