# Pi preparation: block monitor inside API (SQLite)

Before deploying the new architecture (block monitor runs inside the API process, data in SQLite), do the following on the Pi.

## 1. Stop and disable the block monitor service (no longer used)

```bash
sudo systemctl stop node-monitor-block
sudo systemctl disable node-monitor-block
```

Optionally stop everything before updating:

```bash
sudo systemctl stop node-monitor-api node-monitor-web node-monitor-block
```

## 2. Update the code on the Pi

Pull or copy the updated repo to `/home/pi/projects/node-monitor` so it includes:

- `backend/block_store.py`
- `backend/monitor_node.py` (renamed from `block_monitor.py`)
- Updated `backend/api_server.py`, `backend/constants.py`
- Updated `deploy/README.md` (the block service file has been removed)

You can remove old JSON data files if present; they are no longer used:

```bash
cd /home/pi/projects/node-monitor
rm -f data/blocks.json data/difficulty.json data/distribution.json
```

## 3. Install: only API and web services

Copy and enable only the API and web service files (do **not** install the block service):

```bash
sudo cp deploy/node-monitor-api.service deploy/node-monitor-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now node-monitor-api node-monitor-web
```

## 4. Verify

- Dashboard: **http://dashboard.local:8002** (or your Pi IP)
- Blocks and network tabs get data from the API; the API runs the block monitor internally and stores data in `data/node_monitor.db`.
- Logs: `sudo journalctl -u node-monitor-api -f` — you should see block monitor messages (e.g. ZMQ connected, blocks received) from the same process.

