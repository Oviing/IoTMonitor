# IoTMonitor

A live monitor for **OPC UA** and **MQTT**. Browse an OPC UA server's address space,
subscribe to tags or MQTT topics, and watch incoming values update in real time — with a
flash when a value changes, last-changed timestamps, and a small trend sparkline.

## Features

- **Connection management** — add, edit, save, connect, and disconnect multiple OPC UA and MQTT
  connections from the UI. Definitions persist to `data/connections.json`.
- **OPC UA browse + subscribe** — lazily browse the address-space tree and watch variables for
  live value changes.
- **MQTT topic subscribe** — subscribe to topics, including `+` and `#` wildcards, and see
  incoming messages live.
- **Overview dashboard** — inspect connection KPIs and per-signal metric cards with line, bar,
  gauge, and boolean timeline visualizations.
- **Live Values table** — view all subscribed tags and topics with their current value, data
  type, quality, flash-on-change indicator, last-changed time, and an in-memory trend sparkline.
- **Chart preferences** — choose a global chart type or override it for individual signals;
  preferences persist in the browser.
- **Light and dark themes** — follow the system theme or select one from the UI.

History is intentionally in-memory only: the client retains roughly 60 samples per signal and
restarts with an empty history.

## Architecture

- **Backend** (`server/`) — Node.js, Express, and Socket.IO, with `node-opcua` for OPC UA and
  `mqtt` for MQTT. The server retains up to 100 recent samples per signal in memory.
- **Frontend** (`client/`) — a React 18 and Vite single-page app with Overview, Live Values, and
  Explorer views. It communicates with the backend exclusively through Socket.IO.
- **Charts** — dependency-free SVG components; no charting library is required.

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
