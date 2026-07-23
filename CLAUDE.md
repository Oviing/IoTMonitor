# CLAUDE.md

Guidance for AI coding assistants (and humans) working in this repository.

## Overview

**IoTMonitor** is a live monitor for **OPC UA** and **MQTT**. You add OPC UA /
MQTT connections in the UI, browse an OPC UA server's address space or subscribe
to MQTT topics, and watch incoming values update in real time — with a
flash-on-change, last-changed timestamps, and a small in-memory trend sparkline.

It is an **MVP (v1)**. Deliberate non-goals so far: no persistent database
(history is in-memory only), no alerting/thresholds, and no OPC UA
certificate-based auth (None + username/password and basic Sign/SignAndEncrypt
only). Keep changes in that spirit unless asked to expand scope.

## Commands

This is a two-package repo: the backend (`server/`) uses the **root**
`package.json`; the frontend (`client/`) has its own.

```bash
# Install (both packages)
npm install && npm install --prefix client

# Develop — backend on :4000, Vite dev server on :5173 (proxies /socket.io → :4000)
npm run dev            # runs server + client concurrently; open http://localhost:5173

# Individually
npm run server         # nodemon server/index.js
npm run client         # vite dev server (client/)

# Production-style
npm run build          # builds client/dist
npm start              # Express serves client/dist on http://localhost:4000

# Try it with no hardware — demo OPC UA server on opc.tcp://localhost:4840
npm run demo-opcua
```

**There are no test, lint, typecheck, or format scripts, and no CI.** Do not
claim to run them and do not invent them. If you add tooling, wire it into
`package.json` scripts and document it here.

## Architecture

Real-time only: the browser talks to the server over **Socket.IO** — there is
**no REST API** for the UI (the sole HTTP route is `/health`).

### Backend (`server/`, Node ≥18, ES modules)

- `index.js` — entry point. Express app (`/health` + static serving of
  `client/dist` with SPA fallback), HTTP server, attaches Socket.IO via
  `attachSockets(io)`, listens on `PORT`, graceful shutdown on SIGINT/SIGTERM.
- `socket.js` — the orchestrator. Wires client socket events to the managers and
  broadcasts `connection:status`, `opcua:value`, `mqtt:message`, and
  `connections` to every client. Owns the connection list (source of truth for
  config).
- `config.js` — load/save connection definitions to `data/connections.json`.
- `opcua/OpcuaManager.js`, `mqtt/MqttManager.js` — the **Manager pattern** (see
  Conventions).
- `history/HistoryBuffer.js` — in-memory per-key ring buffer (server keeps 100
  samples per key).
- `dev/sampleOpcuaServer.js` — demo OPC UA server exposing a `Demo` folder with
  `Counter` (Int32), `Random` / `Sine` (Double), `Toggle` (Boolean).

### Frontend (`client/`, React 18 + Vite, plain JSX)

- `src/main.jsx` → `src/App.jsx` — no router. `App.jsx` owns all socket wiring
  and live-value state, and switches between three views (`overview` / `live` /
  `explorer`) held in local state — no route changes.
- `src/api/socket.js` — `socket.io-client` singleton + an `emit()` promise
  wrapper around ack callbacks.
- `src/hooks/useTheme.js` — light/dark hook; writes `data-theme` on `<html>`,
  persists to `localStorage`, falls back to `prefers-color-scheme`.
- `src/hooks/useChartPrefs.js` — the chart-type preference model: one global
  default plus per-signal overrides keyed by `${connId}::${id}`, persisted to
  `localStorage` under `iotmonitor.chartPrefs`. `'auto'` means "follow the
  global default" and clears the override.
- `src/lib/format.js` — shared value/time/number-coercion helpers.
- `src/lib/chartType.js` — which chart types apply to a signal
  (`applicableTypes` / `resolveChartType`) and boolean detection.
- `src/components/`:
  - `CommandBar.jsx` — top bar: brand, global search, view switch, server pill,
    theme toggle.
  - `ConnectionManager.jsx` (+ inline connection form) — the left rail's
    connection cards.
  - `views/OverviewView.jsx` (+ `KpiTile.jsx`, `MetricCard.jsx`) — KPI strip +
    per-signal metric cards; `views/LiveValuesView.jsx` — toolbar over the live
    table; `views/ExplorerView.jsx` — the OPC UA / MQTT explorer.
  - `charts/` — dependency-free hand-rolled **SVG** charts: `LineChart`,
    `BarChart`, `Gauge`, `BooleanTimeline`, `Sparkline`, picked by
    `ChartSwitch.jsx`. **No charting library** — keep it that way.
  - `ChartTypeMenu.jsx` — the per-card / global chart-type picker;
    `QualityPill.jsx` — OPC UA quality badge.
  - `OpcuaBrowser.jsx` (recursive address-space tree), `MqttPanel.jsx` (topic
    subscribe) — rendered by the Explorer view.
  - `LiveValues.jsx` — the unified table (grouping, density, sparkline trend).
- `src/styles.css` — one global stylesheet. **Light + dark** via CSS custom
  properties: palette on `:root`, redefined under
  `@media (prefers-color-scheme: dark)` and overridden by
  `:root[data-theme="light"|"dark"]` so the toggle wins. Style through the
  tokens, not inside the media query.

The live-value payload carries only the OPC UA `nodeId`; `App.jsx` keeps a
`labelsRef` map of friendly display names captured when a node is watched, so
values read as e.g. `Counter` rather than `ns=1;i=1001` (falls back to the
nodeId). MQTT subscribed-topic state also lives in `App.jsx` so it survives
view switches.

## Conventions

- **ES modules everywhere** (`"type": "module"`, `import`/`export`). No CommonJS.
- **No TypeScript** — types are expressed with **JSDoc** annotations on plain
  `.js`/`.jsx`. Match that style; don't introduce `.ts` without discussion.
- **Manager pattern** (`OpcuaManager`, `MqttManager`): each extends Node's
  `EventEmitter`, owns a `Map<connId, …>` of live connections, and emits
  `status` + `value` (OPC UA) / `message` (MQTT). `socket.js` is the only thing
  that listens to them and re-broadcasts to clients.
- **Socket.IO ack contract.** Server request handlers are
  `async (payload, ack) => { … ack?.({ ok: true, … }) }` and report failures as
  `ack?.({ ok: false, error })` — they don't throw across the boundary. Client
  code uses the `emit()` wrapper, which resolves to that ack object.
- **Composite key.** A monitored value is keyed as
  ``keyFor(connId, id) => `${connId}::${id}```. This helper is defined
  **identically** in both `server/socket.js` and `client/src/App.jsx` — keep the
  two in sync if you change it.
- **High-frequency React updates.** Live values live in a `useRef` Map; a
  `setTick` version-counter "bump" triggers re-renders instead of storing every
  update in state (client history cap = `HISTORY_CAP = 60`). Don't move this hot
  path into per-value `useState`.
- **JSON safety.** Values crossing the socket are coerced to JSON-safe forms
  (e.g. BigInt → string, typed arrays → arrays) before emit.
- Most server files open with a block comment describing purpose and emitted
  events — keep that convention when adding files.

## Configuration

- `PORT` — backend HTTP/Socket.IO port (default `4000`).
- `OPCUA_PORT` — port for the demo OPC UA server (default `4840`).

## Security

Connection credentials are stored **in plaintext** in `data/connections.json`
(gitignored, so secrets aren't committed). This is **not** production-safe —
adding encryption/secret management and access control is required before using
against untrusted or production environments. Don't weaken this further; call it
out if a change touches credential handling.

## Gotchas

- Generated / gitignored, don't commit: `data/` (`connections.json`),
  `client/dist/`, `**/PKI/`, `certificates/`, `*.log`, `.env`.
- OPC UA cert stores under `**/PKI/` are created at runtime by `node-opcua`.
- Node **≥18** is required.
- Dev serves the client on **:5173** (Vite) while the API/socket is on **:4000**;
  production serves everything from `:4000`.
