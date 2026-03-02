# Bitcoin RPC Commands Reference

This document provides a comprehensive guide for interacting with your Bitcoin node both curl and bitcoin-cli commands.

## Node Status
- [Bitcoin Node Status](https://bitnodes.io/) – check your node’s reachability (replace with your node’s address in the URL if needed)

## Quick Command Reference

### Essential Commands
- [1. Blockchain Information](#1-blockchain-information) - `btc getblockchaininfo`
- [2. Network Information](#2-network-information) - `btc getnetworkinfo`
- [3. Memory Pool Information](#3-memory-pool-information) - `btc getmempoolinfo`
- [4. Block Information](#4-get-block-information) - `btc getblock`, `btc getbestblockhash`
- [5. Transaction Information](#5-transaction-information) - `btc getrawtransaction`

### Wallet Commands
- [6. Wallet Information](#6-wallet-information) - `btc getwalletinfo`, `btc listwallets`
- [7. Wallet Management](#13-wallet-management-commands) - `btc loadwallet`, `btc unloadwallet`

### Advanced Monitoring
- [8. Index Information](#7-index-information) - `btc getindexinfo`
- [9. UTXO Set Information](#8-utxo-set-information) - `btc gettxoutsetinfo`
- [10. Peer Information](#9-peer-information) - `btc getpeerinfo`
- [11. ZMQ Notifications](#11-zmq-notifications) - Real-time block and transaction notifications

### Background Processes
- [11. Transaction Index Monitoring](#12-transaction-index-monitoring) - `btc getindexinfo`
- [12. Log Monitoring](#14-log-monitoring) - `tail -f debug.log`
- [13. Pruning Status](#15-pruning-status) - `btc getblockchaininfo`

### Troubleshooting
- [14. Node Status](#10-node-status) - `btc getgeneralinfo`, `btc getmemoryinfo`
- [15. Connection Issues](#16-connection-and-sync-issues) - `btc getnetworkinfo`

### Quick Aliases
```bash
# Set up your alias (use environment variables for security)
alias btc='/opt/homebrew/bin/bitcoin-cli -rpcuser=$BITCOIN_RPC_USER -rpcpassword=$BITCOIN_RPC_PASSWORD -rpcport=$BITCOIN_RPC_PORT'

# Most used commands
btc getblockchaininfo | jq '{blocks, verificationprogress}'
btc getindexinfo
btc getwalletinfo | jq '{walletname, txcount, balance}'
btc listwallets
```

### Security Setup

```bash
# Set environment variables (replace with your actual credentials)
export BITCOIN_RPC_USER="your_username"
export BITCOIN_RPC_PASSWORD="your_password"
export BITCOIN_RPC_PORT="8332"

# Or use secure configuration for Python scripts
python3 backend/config_service.py --setup
```

## Basic RPC Structure


```bash
# Set up alias for easier use
alias btc='/opt/homebrew/bin/bitcoin-cli -rpcuser=$BITCOIN_RPC_USER -rpcpassword=$BITCOIN_RPC_PASSWORD -rpcport=$BITCOIN_RPC_PORT'

# Then use simple commands
btc <method_name> [parameters]
```

## Essential Node Information Commands

### 1. Blockchain Information

```bash
btc getblockchaininfo
```


**Key fields to monitor:**
- `blocks`: Current block height
- `headers`: Number of headers downloaded
- `verificationprogress`: Sync progress (0.0 to 1.0)
- `initialblockdownload`: Whether still in IBD
- `pruned`: Whether node is pruned

### 2. Network Information

```bash
btc getnetworkinfo
```


**Key fields:**
- `connections`: Total peer connections
- `connections_in`: Incoming connections
- `connections_out`: Outgoing connections
- `version`: Bitcoin Core version
- `subversion`: Detailed version info

### 3. Memory Pool Information

```bash
btc getmempoolinfo
```


**Key fields:**
- `size`: Number of transactions in mempool
- `bytes`: Total mempool size in bytes
- `total_fee`: Total fees in mempool

## Transaction and Block Commands

### 4. Get Block Information

```bash
# Get latest block hash
btc getbestblockhash

# Get block by hash
btc getblock <block_hash>

# Get block by height
btc getblockhash <height>
```


### 5. Transaction Information

```bash
# Get transaction by ID
btc getrawtransaction <txid> true

# Get transaction from mempool
btc getmempoolentry <txid>
```


## Wallet Commands (if wallet is loaded)

### 6. Wallet Information

```bash
# List wallets
btc listwallets

# Get wallet info
btc getwalletinfo

# Get balance
btc getbalance
```

## Advanced Diagnostic Commands

### 7. Index Information

```bash
# Check if transaction index is available
btc getindexinfo
```

### 8. UTXO Set Information

```bash
# Get UTXO set statistics (can be slow)
btc gettxoutsetinfo
```

### 9. Peer Information

```bash
# Get peer information
btc getpeerinfo
```

## Troubleshooting Commands

### 10. Node Status


```bash
# Get general node information
btc getgeneralinfo

# Get memory usage information
btc getmemoryinfo

# Get RPC server information
btc getrpcinfo
```

## JSON Output Formatting

To make the output more readable, pipe through `jq`:

```bash
# Install jq if not available: brew install jq
btc getblockchaininfo | jq '{blocks, verificationprogress}'
```


## Indexing and Background Process Monitoring

### 12. Transaction Index Monitoring
```bash
# Check indexing status
btc getindexinfo

# Calculate indexing progress percentage (most useful command)
btc getindexinfo | jq '.txindex.best_block_height / 918464 * 100'

# Check if indexing is complete
btc getindexinfo | jq '.txindex.synced'

# Monitor indexing in real-time (updates every 30 seconds)
watch -n 30 'btc getindexinfo | jq ".txindex.best_block_height"'

# Quick progress check (shows percentage)
btc getindexinfo | jq '.txindex.best_block_height / 918464 * 100'
```

### 13. Wallet Management Commands
```bash
# List all loaded wallets
btc listwallets

# Get info about specific wallet
btc -rpcwallet=<walletname> getwalletinfo

# Unload a wallet (removes from memory)
btc unloadwallet <walletname>

# Load a wallet
btc loadwallet <walletname>

# Get transactions from specific wallet
btc -rpcwallet=<walletname> listtransactions "*" 100

# Get balance from specific wallet
btc -rpcwallet=<walletname> getbalance
```

### 14. Log Monitoring
```bash
# Check recent indexing progress in logs
tail -20 /Volumes/MiniSSD/Bitcoin/Knots/debug.log | grep -i index

# Monitor logs in real-time
tail -f /Volumes/MiniSSD/Bitcoin/Knots/debug.log | grep -i index

# Check for errors in logs
grep -i error /Volumes/MiniSSD/Bitcoin/Knots/debug.log | tail -10
```

### 15. Pruning Status
```bash
# Check if node is pruned
btc getblockchaininfo | jq '{pruned, pruneheight}'

# Get UTXO set info (can be slow)
btc gettxoutsetinfo | jq '{total_amount, transactions, height}'
```

## Troubleshooting Commands

### 16. Connection and Sync Issues
```bash
# Test RPC connection
btc getblockchaininfo | jq '.chain'

# Check network status
btc getnetworkinfo | jq '{connections, connections_in, connections_out}'

# Verify wallet is accessible
btc getwalletinfo | jq '{walletname, txcount, balance}'

# Check if node is still syncing
btc getblockchaininfo | jq '{verificationprogress, initialblockdownload}'
```

## 11. ZMQ Notifications

### Overview
ZeroMQ (ZMQ) provides real-time notifications for blockchain events, enabling instant detection of new blocks and transactions without polling.

### Configuration
Add to your `bitcoin.conf`:
```ini
# ZMQ Notifications
zmqpubhashblock=tcp://127.0.0.1:28332
zmqpubhashtx=tcp://127.0.0.1:28333
zmqpubrawblock=tcp://127.0.0.1:28334
zmqpubrawtx=tcp://127.0.0.1:28335
```

### Benefits
- **Instant notifications** - No polling delays
- **Lower resource usage** - No constant RPC calls
- **Better reliability** - Catches blocks even after node restarts
- **Real-time monitoring** - Perfect for blockchain monitoring applications

### Usage with Monitor
```bash
# The monitor automatically tries ZMQ first, falls back to polling
python3 backend/block_monitor.py --continuous

# Custom ZMQ endpoint
python3 backend/block_monitor.py --continuous --zmq-endpoint tcp://127.0.0.1:28332
```

### Verification
```bash
# Check if ZMQ is enabled in Bitcoin logs
grep -i zmq ~/.bitcoin/debug.log

# Check Bitcoin help for ZMQ options
bitcoind -h | grep zmq
```
