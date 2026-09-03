# IoTMonitor

A live monitor for **OPC UA** and **MQTT**. Browse an OPC UA server's address space,
subscribe to tags or MQTT topics, and watch incoming values update in real time — with a
flash when a value changes, last-changed timestamps, and a small trend sparkline.

## Features

- **Connection management** — add, edit, save, connect/disconnect multiple OPC UA and MQTT
  connections from the UI. Definitions persist to `data/connections.json`.
- **OPC UA browse, subscribe + write** — lazily browse the address space tree, watch variables
  for live changes, and write test values directly from the explorer.
- **MQTT subscribe + publish** — subscribe to topics (with `+` / `#` wildcards), see incoming
  messages live, and publish test payloads with optional retain.
- **Live Values table** — unified view of all subscribed tags/topics with current value, data
  type, a **flash on change**, last-changed time, and an in-memory trend sparkline
  (last ~60 samples, no database).

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
3. Expand the **Demo** folder and tick **watch** on `Counter`, `Random`, `Sine`, `Toggle`, or
   the writable `Setpoint` variable.
4. Watch the **Live Values** table update and flash on change. Use **write** beside `Setpoint` to
   send a test value directly from the explorer.

For MQTT, click **+ MQTT** and use a public broker such as
`mqtt://test.mosquitto.org:1883`. Connect, open **Topics**, and subscribe to `test/#` (or `#`).
Use **Publish a test message** in the same panel to send a payload to `test/hello`; because the
subscription matches that topic, the message appears in Overview and Live Values.

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
