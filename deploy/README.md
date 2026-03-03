# Systemd deployment (Raspberry Pi)

Service files for running node-monitor under systemd. Ports: **8002** (dashboard), **8003** (API).

## Prerequisites on the Pi

- Repo at `/home/pi/projects/node-monitor`
- Python venv created and deps installed: `python3 -m venv venv && source venv/bin/activate && python -m pip install -r backend/requirements.txt`
- Frontend built: `cd frontend && npm install && npm run build`
- `shared/constants.json` uses `DASHBOARD_PORT: 8002` and `API_SERVER_PORT: 8003` (default in repo)

## Install

```bash
sudo cp deploy/node-monitor-api.service deploy/node-monitor-web.service deploy/node-monitor-block.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now node-monitor-api node-monitor-web node-monitor-block
```

## Access

- Dashboard: **http://miner.local:8002** (or `http://<pi-ip>:8002`)
- API is proxied via the dashboard; no need to open 8003 externally.

## Commands

```bash
sudo systemctl status node-monitor-api node-monitor-web node-monitor-block
sudo journalctl -u node-monitor-api -f
```
