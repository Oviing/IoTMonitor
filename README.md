# IoTMonitor

A live monitor for **OPC UA** and **MQTT**. Browse an OPC UA server's address space,
subscribe to tags or MQTT topics, and watch incoming values update in real time — with a
flash when a value changes, last-changed timestamps, and a small trend sparkline.

## Features

- **Connection management** — add, edit, save, connect/disconnect multiple OPC UA and MQTT
  connections from the UI. Definitions persist to `data/connections.json`.
- **OPC UA browse + subscribe** — lazily browse the address space tree and tick "watch" on any
  variable to subscribe to live value changes.
- **MQTT topic subscribe** — subscribe to topics (with `+` / `#` wildcards) and see incoming
  messages live.
- **Live dashboards** — switch between an overview of KPI tiles and configurable metric cards,
  a unified Live Values table, and the OPC UA/MQTT explorer.
- **Flexible visualization** — display numeric signals as line charts, bars, gauges, or sparklines,
  and boolean signals as timelines. Choose a global default or override individual signals.
- **Real-time history** — current value, data type, quality, flash-on-change, last-changed time,
  and the latest ~60 samples are kept in memory (no database).
- **Light and dark themes** — follow the system preference by default or choose a theme in the UI.

## Architecture

- **Backend** (`server/`): Node.js + Express + Socket.IO. `node-opcua` for OPC UA,
  `mqtt` for MQTT. Recent values are kept in an in-memory ring buffer.
- **Frontend** (`client/`): React + Vite single-page app, talking to the backend over Socket.IO.

## Getting started

Requires Node.js 18+.

```bash
# 1. Install backend + frontend dependencies
npm install
npm install --prefix client

# 2. Development (backend on :4000, Vite dev server on :5173 with a proxy)
npm run dev
# then open http://localhost:5173

# --- or, production-style ---
npm run build          # builds client/dist
npm start              # Express serves the built app on http://localhost:4000
```

## Try it without any hardware

A local demo OPC UA server with a few changing variables is included:

```bash
npm run demo-opcua     # listens on opc.tcp://localhost:4840
```

Then in the UI:

1. Click **+ OPC UA**, name it, set the endpoint to `opc.tcp://localhost:4840`, save.
2. Click **Connect**, then **Browse**.
3. Expand the **Demo** folder and tick **watch** on `Counter`, `Random`, `Sine`, or `Toggle`.
4. Watch the **Live Values** table update and flash on change.

For MQTT, click **+ MQTT** and use a public broker such as
`mqtt://test.mosquitto.org:1883`, connect, open **Topics**, and subscribe to `test/#` (or `#`).
Publish a test message, e.g.:

```bash
mosquitto_pub -h test.mosquitto.org -t test/hello -m 42
```

## Configuration

- `PORT` — backend HTTP/Socket.IO port (default `4000`).
- `OPCUA_PORT` — port for the demo OPC UA server (default `4840`).

## Security note

Connection credentials are stored **in plaintext** in `data/connections.json` for simplicity.
That file is gitignored so secrets are not committed. Do not use this as-is for untrusted or
production environments without adding encryption/secret management and access control.

## Roadmap / non-goals (v1)

- No persistent database (history is in-memory only).
- No alerting/thresholds yet.
- OPC UA certificate-based authentication is not yet supported (None + username/password and
  basic Sign/SignAndEncrypt policies are).
