# RPC configuration for Raspberry Pi / Start9

This guide explains how to run the chain-monitor dashboard against a Bitcoin node on a Raspberry Pi (e.g. Start9 with Bitcoin Knots), with minimal load on the node.

## Overview

- The dashboard API server (Python) talks to the node via Bitcoin RPC.
- Config is stored in **`~/.bitcoin_secure/config.json`** (created by `backend/config_service.py --setup` on your main machine).
- On the Pi, you can use the same config format and point `rpc_url` and `cookie_file` at the node (often the same host as the dashboard).

## 1. API response caching (node load)

The API server caches responses so the node is not hit on every tab switch or refresh:

| Endpoint     | Cache duration | Tuning constant (in `backend/constants.py`) |
|-------------|----------------|----------------------------------------------|
| `/api/node` | 30 s           | `NODE_CACHE_SECONDS`                         |
| `/api/wallet` | 30 s         | `WALLET_CACHE_SECONDS`                       |
| `/api/blocks` | 60 s          | `BLOCKS_CACHE_SECONDS`                       |
| `/api/distribution` | 60 s    | (same as blocks)                             |

To reduce load further on a Pi, you can increase these (e.g. 60 s for node/wallet, 120 s for blocks) in `backend/constants.py`.

Block and network data are stored in JSON under `data/`: the monitor writes enriched blocks to **`data/blocks.json`** (last 100 blocks), hashrate/difficulty history to **`data/difficulty.json`**, and pool distribution to **`data/distribution.json`**. The API reads these files; no RPC is used for the block list or network history on request.

## 2. Config file location and format

- **Path:** `~/.bitcoin_secure/config.json`  
  (i.e. `$HOME/.bitcoin_secure/config.json` on the Pi.)

**Cookie-based (recommended):**

```json
{
  "rpc_url": "http://127.0.0.1:8332",
  "rpc_port": "8332",
  "cookie_file": "/path/to/bitcoin/datadir/.cookie",
  "auth_method": "cookie"
}
```

**Username/password:**

```json
{
  "rpc_url": "http://127.0.0.1:8332",
  "rpc_port": "8332",
  "rpc_user": "your_rpc_user",
  "rpc_password": "your_rpc_password",
  "auth_method": "password"
}
```

Use the same structure whether the dashboard runs on the Pi or on another machine talking to the Pi’s node.

## 3. Running dashboard on the same Pi as the node (Start9 / Bitcoin Knots)

1. **Find the Bitcoin Knots datadir on the Pi**  
   On Start9 it is often under something like:
   - `/embassy-data/package-data/volumes/bitcoind/data/main/`  
   (Exact path can differ for “Bitcoin Knots” – check the service’s volume or docs.)  
   The RPC cookie is at `<datadir>/.cookie`.

2. **Find RPC host and port**  
   Usually `127.0.0.1` and `8332` if the dashboard runs on the same host as the node. If the node runs in a container, use the host/port that expose RPC (e.g. `127.0.0.1` and the mapped port).

3. **Create chain-monitor config on the Pi**
   - Create the config directory:
     ```bash
     mkdir -p ~/.bitcoin_secure
     chmod 700 ~/.bitcoin_secure
     ```
   - Create `~/.bitcoin_secure/config.json` with:
     - `rpc_url`: `http://127.0.0.1:8332` (or the correct host/port).
     - `cookie_file`: absolute path to the node’s `.cookie` file (e.g. `<datadir>/.cookie`).
     - `rpc_port`: same port as in `rpc_url`.
     - `auth_method`: `"cookie"`.
   - Restrict permissions:
     ```bash
     chmod 600 ~/.bitcoin_secure/config.json
     ```

4. **Optional: cookie discovery via datadir**  
   If you don’t want to hardcode `cookie_file`, you can set the Bitcoin datadir so the config tool can find `.cookie`:
   ```bash
   export BITCOIN_DATADIR=/path/to/bitcoin/datadir
   ```
   Then run the secure config setup; it will search for `.cookie` under `BITCOIN_DATADIR`. You can still manually edit `config.json` afterward to set `rpc_url` and `cookie_file` for the Pi.

## 4. Running dashboard on another machine (e.g. Mac) against the Pi’s node

- **Security:** Only do this over a trusted network (e.g. LAN) or over Tor/SSH. Exposing RPC to the internet is risky.
- On the **Pi**, ensure bitcoind is binding RPC to an address your Mac can reach (e.g. `rpcbind=0.0.0.0` or the Pi’s LAN IP) and that firewall allows the RPC port.
- On the **Mac**, set `~/.bitcoin_secure/config.json` with:
  - `rpc_url`: `http://<pi-ip>:8332` (e.g. `http://192.168.1.10:8332`).
  - Cookie auth usually only works when the client is on the same host as the node (cookie file is on the Pi). So for remote access you typically use **username/password** in `bitcoin.conf` on the Pi and in `config.json` on the Mac:
    - `rpc_user` and `rpc_password` in `config.json`,
    - `auth_method`: `"password"`.

## 5. Verify

- Start the dashboard (e.g. `cd frontend && npm run dev`).
- Open the Node tab; if you see blockchain/network data, RPC config is correct.
- Check API server logs for connection errors if the dashboard shows “disconnected”.

## 6. Summary

| Goal                         | Action |
|-----------------------------|--------|
| Less load on node            | Increase `NODE_CACHE_SECONDS`, `WALLET_CACHE_SECONDS`, `BLOCKS_CACHE_SECONDS` in `backend/constants.py`. |
| Dashboard on Pi, node on Pi | `~/.bitcoin_secure/config.json` with `rpc_url` (e.g. `http://127.0.0.1:8332`) and `cookie_file` pointing to the Knots datadir `.cookie`. |
| Dashboard on Mac, node on Pi| `config.json` on Mac with `rpc_url` = `http://<pi-ip>:8332` and `rpc_user` / `rpc_password` (cookie not used for remote). |
