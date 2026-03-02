#!/usr/bin/env python3
"""
Fetch historical Bitcoin network data (hashrate and difficulty)
by analyzing past blocks and calculating network metrics
"""

import sys
import os
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rpc_service import create_rpc_connection

class HistoricalNetworkDataFetcher:
    """Fetch historical network data from Bitcoin node"""

    def __init__(self):
        self.rpc_service = create_rpc_connection()
        if not self.rpc_service:
            print("❌ Failed to create RPC connection")
            sys.exit(1)

    def get_block_data(self, block_height: int) -> Optional[Dict[str, Any]]:
        """Get block data for a specific height"""
        try:
            # Get block hash first
            block_hash_result = self.rpc_service.rpc_call('getblockhash', [block_height])
            if 'result' not in block_hash_result:
                return None

            block_hash = block_hash_result['result']

            # Get block details
            block_result = self.rpc_service.rpc_call('getblock', [block_hash])
            if 'result' not in block_result:
                return None

            block = block_result['result']
            return block

        except Exception as e:
            print(f"Error getting block {block_height}: {e}")
            return None

    def calculate_hashrate_for_block(self, block_height: int) -> Optional[float]:
        """Calculate hashrate for a specific block using surrounding blocks"""
        try:
            # Get blocks around the target block for hashrate calculation
            # We'll use a 120-block window (similar to getnetworkhashps)
            start_height = max(0, block_height - 60)
            end_height = min(block_height + 60, block_height + 120)

            # Get the target block
            target_block = self.get_block_data(block_height)
            if not target_block:
                return None

            # Get blocks for hashrate calculation
            blocks_data = []
            for height in range(start_height, end_height + 1):
                if height == block_height:
                    blocks_data.append(target_block)
                else:
                    block_data = self.get_block_data(height)
                    if block_data:
                        blocks_data.append(block_data)

            if len(blocks_data) < 2:
                return None

            # Calculate hashrate using the formula: (2^32 * difficulty) / average_block_time
            # This is an approximation
            difficulty = target_block.get('difficulty', 0)
            if difficulty == 0:
                return None

            # Calculate average block time from the blocks we have
            times = [block.get('time', 0) for block in blocks_data if block.get('time', 0) > 0]
            if len(times) < 2:
                return None

            times.sort()
            total_time = times[-1] - times[0]
            avg_block_time = total_time / (len(times) - 1) if len(times) > 1 else 600  # Default to 10 minutes

            # Calculate hashrate: (2^32 * difficulty) / avg_block_time
            hashrate_hs = (2**32 * difficulty) / avg_block_time
            hashrate_ths = hashrate_hs / (10**12)  # Convert to TH/s

            return hashrate_ths

        except Exception as e:
            print(f"Error calculating hashrate for block {block_height}: {e}")
            return None

    def fetch_historical_data(self, start_height: int, end_height: int, step: int = 100) -> List[Dict[str, Any]]:
        """Fetch historical network data for a range of blocks"""
        historical_data = []

        print(f"Fetching historical data from block {start_height} to {end_height} (step: {step})")

        for block_height in range(start_height, end_height + 1, step):
            try:
                print(f"Processing block {block_height}...")

                # Get block data
                block_data = self.get_block_data(block_height)
                if not block_data:
                    print(f"  ⚠️  Could not get block {block_height}")
                    continue

                # Extract basic info
                block_time = block_data.get('time', 0)
                difficulty = block_data.get('difficulty', 0)

                # Calculate hashrate
                hashrate = self.calculate_hashrate_for_block(block_height)

                # Create data entry
                data_entry = {
                    'timestamp': datetime.fromtimestamp(block_time).strftime('%Y-%m-%d %H:%M:%S'),
                    'blockHeight': block_height,
                    'hashRate': f"{hashrate:.2f}" if hashrate else "N/A",
                    'difficulty': f"{difficulty:.2f}" if difficulty else "N/A"
                }

                historical_data.append(data_entry)
                print(f"  ✅ Block {block_height}: Hashrate={hashrate:.2f} TH/s, Difficulty={difficulty:.2f}")

                # Small delay to avoid overwhelming the node
                time.sleep(0.1)

            except Exception as e:
                print(f"  ❌ Error processing block {block_height}: {e}")
                continue

        return historical_data

def main():
    """Main function"""
    import argparse

    parser = argparse.ArgumentParser(description='Fetch historical Bitcoin network data')
    parser.add_argument('--start-height', type=int, default=920000,
                       help='Starting block height (default: 920000)')
    parser.add_argument('--end-height', type=int, default=920400,
                       help='Ending block height (default: 920400)')
    parser.add_argument('--step', type=int, default=100,
                       help='Step size between blocks (default: 100)')

    args = parser.parse_args()

    print("🔍 Bitcoin Historical Network Data Fetcher")
    print("=" * 50)

    fetcher = HistoricalNetworkDataFetcher()

    # Get current blockchain info
    blockchain_info = fetcher.rpc_service.get_blockchain_info()
    current_height = blockchain_info.get('result', {}).get('blocks', 0)

    print(f"Current blockchain height: {current_height}")
    print(f"Fetching data from block {args.start_height} to {args.end_height}")

    # Fetch historical data
    historical_data = fetcher.fetch_historical_data(
        args.start_height,
        args.end_height,
        args.step
    )

    if historical_data:
        print(f"✅ Successfully fetched {len(historical_data)} data points")
    else:
        print("❌ No historical data fetched")

if __name__ == "__main__":
    main()
