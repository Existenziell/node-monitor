# Systemd deployment (Raspberry Pi)

Service files for running node-monitor under systemd. Ports: **8002** (dashboard), **8003** (API).

**Architecture:** The block monitor runs *inside* the API process (background thread). Block and network data are stored in SQLite (`data/node_monitor.db`). You only need two services: **node-monitor-api** and **node-monitor-web**. The separate **node-monitor-block** service is no longer used.

## Prerequisites on the Pi

- Repo at `/home/pi/projects/node-monitor`
- Python venv created and deps installed: `python3 -m venv venv && source venv/bin/activate && python -m pip install -r backend/requirements.txt`
- Frontend built: `cd frontend && npm install && npm run build`
- `shared/constants.json` uses `DASHBOARD_PORT: 8002` and `API_SERVER_PORT: 8003` (default in repo)

For first-time setup or when moving from the old (separate block service) setup, see [PI_PREPARATION.md](PI_PREPARATION.md).

## Install

```bash
sudo cp deploy/node-monitor-api.service deploy/node-monitor-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now node-monitor-api node-monitor-web
```

Only these two service files are needed; the block monitor runs inside the API process.

**Remote Bitcoin node (e.g. node on Pi5, monitor on Pi3):** In the dashboard **Settings** tab set **RPC Host** to the node’s IP. To use ZMQ for block notifications, add to the API service (e.g. override or `sudo systemctl edit node-monitor-api`): `Environment="ZMQ_ENDPOINT=tcp://<node-ip>:28332"`. See main [README](../README.md) for full setup.

## Access

- Dashboard: **http://dashboard.local:8002** (or `http://<pi-ip>:8002`)
- API is proxied via the dashboard; no need to open 8003 externally.

**Firefox can't connect (Chrome/Safari work):** On macOS, open **System Settings → Privacy & Security → Local Network** and ensure **Firefox** is allowed.

## Commands

```bash
sudo systemctl status node-monitor-api node-monitor-web
sudo journalctl -u node-monitor-api -f
```
