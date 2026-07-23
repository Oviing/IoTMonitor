# IoTMonitor — Modern UI Concept

A bold redesign concept for the IoTMonitor front end. It reimagines the
presentation layer while **preserving the existing Socket.IO data contract** and
the four functional areas the app already has: connection management, OPC UA
address-space browsing, MQTT topic subscription, and the unified live-values
view.

This is a **concept + interactive mockup**, not an implementation. No app code in
`server/` or `client/` is changed by this document.

- **Clickable mockup (in repo):** [`ui-mockup.html`](./ui-mockup.html) — open it in a browser.
- **Published mockup (Artifact):** https://claude.ai/code/artifact/1e2789e4-cefe-4ce0-98a3-507f5f5c4fa8

---

## 1. Why redesign

Today's UI is a single, dense, dark screen: a header, a fixed 320px sidebar
(connections), and a main area dominated by one big Live Values **table**. The
only visualization is a lone 90×24px SVG sparkline. It works, but:

- Everything is **detail, no summary** — there's no glanceable "is the plant
  healthy?" view; you read rows.
- **One chart type.** Numbers, booleans, and waveforms all render the same way.
- **Dark-only, fixed-width**, not responsive, no per-connection view, no
  grouping/filtering, no place for the alerting the roadmap wants.

The redesign keeps the app's real-time-first soul but shifts it from "a table of
everything" to an **instrument panel**: summary before detail, state encoded in
form, and live signals drawn like signals.

## 2. Vision & principles

1. **Real-time first.** The live value is the hero. Motion is meaningful — a
   value flashes only when it actually changes.
2. **Calm until it matters.** A healthy system is quiet and monochrome-ish;
   attention (warn/critical) is the only thing that uses warm color.
3. **Summary before detail.** An Overview answers "what's happening" at a glance;
   the table and explorer are there when you need specifics.
4. **Signals drawn as signals.** Counters get a line, waveforms an area trace,
   booleans a state timeline, bounded process values a gauge — not all sparklines.
5. **Responsive & themed.** Works from a control-room monitor down to a phone;
   ships **light and dark** with equal care.
6. **Accessible (WCAG AA).** Color is never the only signal; keyboard-operable;
   value changes announced to assistive tech via live regions.

## 3. Design language

A cool, instrument-inspired system — "**phosphor on graphite**." One cyan accent
carries interaction and the live traces; two cool protocol hues distinguish OPC
UA from MQTT; warm colors are reserved strictly for status so alerts pop.

### Color tokens

Defined as CSS custom properties so both themes and all components stay in sync.

```css
:root {
  /* Neutrals — cool graphite, biased toward the accent (not a flat grey) */
  --ground:     #0d1117;   /* app background            */
  --surface-1:  #151b24;   /* cards / rails             */
  --surface-2:  #1c2530;   /* raised / headers          */
  --surface-3:  #232e3b;   /* hover / inputs            */
  --border:     #263140;
  --text:       #e6edf5;
  --text-dim:   #9fb0c3;
  --text-mute:  #64748b;

  /* Brand accent — cyan phosphor (interaction, focus, live-trace emphasis) */
  --accent:     #22c3e6;
  --accent-ink: #04141a;   /* text on an accent fill    */

  /* Protocol hues — cool, distinct from the accent and from each other */
  --opcua:      #6e8bff;   /* indigo */
  --mqtt:       #c264ff;   /* violet */

  /* Semantic status — the ONLY warm colors; separate from the accent */
  --good:       #3fb950;
  --warn:       #e3a008;
  --danger:     #f04e4e;

  --grid:       rgba(255,255,255,0.05);  /* faint chart grid */
}

/* Light theme redefines only the tokens; components never change */
:root[data-theme="light"] {
  --ground:     #f4f6f9;
  --surface-1:  #ffffff;
  --surface-2:  #ffffff;
  --surface-3:  #eef1f5;
  --border:     #d8dee6;
  --text:       #0f1720;
  --text-dim:   #51606f;
  --text-mute:  #7a8898;
  --accent:     #0891b2;   /* deepened for contrast on light */
  --accent-ink: #ffffff;
  --opcua:      #4457d6;
  --mqtt:       #9333ea;
  --good:       #1a7f37;
  --warn:       #9a6700;
  --danger:     #cf222e;
  --grid:       rgba(0,0,0,0.06);
}
```

Theme resolution: default to the OS preference via
`@media (prefers-color-scheme: dark)`, and let a `data-theme` attribute on the
root (set by the in-app toggle) override it in both directions.

### Typography

CSP-safe stacks — no webfont CDN — with the personality coming from treatment,
not an exotic face:

- **UI / headings:** `system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
- **Instrument readouts & data:** a monospace face —
  `ui-monospace, "SF Mono", "JetBrains Mono", "Fira Code", Consolas, monospace`
  — always with `font-variant-numeric: tabular-nums` so digits don't jitter as
  values update. This monospace **readout** is the signature type move: live
  values are shown large, like a gauge display.
- **Micro-labels** (column heads, badges): uppercase, ~0.5px letter-spacing,
  `--text-mute`.

### Form & motion

- Cards: 12px radius, 1px `--border`, subtle elevation; the accent appears as a
  thin top **signal stripe** or a glow on the active element, not as fill
  everywhere.
- **Flash-on-change** stays (it's the app's identity) but is quick, single, and
  suppressed under `prefers-reduced-motion`. Live traces pause/settle to a static
  snapshot when reduced motion is requested.
- Status is encoded in **form as well as color**: a dot + a pill + a severity
  stripe, so it survives colorblindness and grayscale.

## 4. Information architecture

From one dense screen to a **control surface** with three zones and switchable
views.

```
┌──────────────────────────────────────────────────────────────────┐
│  Command bar:  ◆ IoTMonitor │ search │ [Overview|Live|Explorer]   │
│                              server ● connected │ ☾ theme         │
├───────────────┬──────────────────────────────────────────────────┤
│ Connections   │  MAIN CANVAS (one of):                            │
│ rail          │   • Overview   — KPI strip + live metric cards    │
│  ● Line A OPCUA│   • Live Values — upgraded table (group/filter)   │
│  ● Broker MQTT │   • Explorer   — OPC UA tree + MQTT topics        │
│  + Add         │                                                  │
└───────────────┴──────────────────────────────────────────────────┘
```

- **Command bar** — brand, global **search/filter** across tags & topics, the
  view switch, server-connection pill, and the theme toggle. (Replaces today's
  bare header.)
- **Connections rail** — each connection is a card: status dot + name + protocol
  badge (OPC UA / MQTT) + endpoint (mono) + quick stats (watched tags, update
  rate) + connect/disconnect. Selecting one scopes the canvas to it.
- **Overview** — the new default. A **KPI strip** (active connections, watched
  tags, updates/sec, active alerts) over a responsive grid of **live metric
  cards** — one per watched signal, each drawn with the visualization that fits
  its type.
- **Live Values** — the current table, upgraded: source badge, tag/topic, a large
  mono value that flashes on change, data type, an **inline trend**, a
  **quality** pill, last-changed (relative), and a remove control — plus
  **grouping** (by connection) , a **filter** box, and a **density** toggle.
- **Explorer** — OPC UA address-space tree browse and MQTT topic subscription,
  given room to breathe side by side (today they're squeezed above the table).

## 5. Key components

| Component | What it is | Replaces / adds |
|---|---|---|
| **KPI stat tile** | Big tabular-mono number + label + tiny delta/trend | New — the missing summary layer |
| **Live metric card** | Per-signal instrument: title, source badge, big readout, status stripe, and a **type-appropriate chart** | Upgrades the lone sparkline |
| **Line chart** | Integer/counter trends, faint grid, emphasized endpoint dot | New chart type |
| **Area trace** | Waveforms / continuous doubles (e.g. `Sine`), accent fill | New chart type |
| **Radial gauge** | Bounded process values (flow, temp) with warn/critical arcs | New chart type |
| **Boolean timeline** | On/off signals (e.g. `Toggle`) as a state band | New chart type |
| **Inline sparkline** | Compact trend inside a table row | Keeps today's idea, restyled |
| **Connection card** | Status-first connection with quick stats | Upgrades sidebar list item |
| **Quality / status pill** | Good / uncertain / bad, with icon + color + text | New — surfaces OPC UA quality |
| **Alert affordance** | A card/row can enter warn/critical with a stripe + pill | New — hooks for the roadmap's thresholds |
| **Empty / loading / error states** | First-run guidance, skeletons, and actionable errors | Upgrades the single dashed hint |

All of these are **presentation-only**: they render the same payloads the current
`opcua:value` / `mqtt:message` events already deliver.

## 6. Accessibility & theming

- **Contrast:** text and accents meet WCAG AA on both grounds (the light theme
  deepens the cyan/indigo/violet so they stay legible on white).
- **Not color-alone:** every status carries an icon/shape and text label.
- **Keyboard:** full tab order, visible focus rings (accent), Escape closes
  dialogs, the tree and table are arrow-navigable.
- **Live regions:** an `aria-live="polite"` region announces newly-changed values
  and new alerts for screen-reader users, throttled so it isn't chatty.
- **Reduced motion:** `prefers-reduced-motion` disables the flash and freezes
  traces to a static last-N snapshot.

## 7. Mapping to today (evolution, not rewrite)

| Today | Proposed |
|---|---|
| Bare header (title + WS pill) | **Command bar** (search, view switch, theme, WS pill) |
| Fixed 320px sidebar list | **Connections rail** with status-first connection cards |
| OPC UA tree + MQTT panel crammed above the table | **Explorer** view with room; browsing scoped per connection |
| One giant Live Values table, always on | **Overview** (default) + **Live Values** view with group/filter/density |
| Lone 90×24 sparkline | **Metric cards** with line / area / gauge / boolean charts + inline sparkline |
| Dark theme only, fixed width | **Light + dark**, fully responsive to mobile |
| Errors as red text; one dashed empty hint | Proper **empty / loading / error** states and **alert** affordances |

Because the socket event contract is untouched, this can land incrementally.

## 8. Phased roadmap

1. **Foundations** — introduce the token system (both themes) + the theme
   toggle; restructure the shell into command bar / rail / canvas. Table keeps
   working throughout.
2. **Card & chart system** — build the metric card and the line/area/gauge/
   boolean charts; replace the sparkline; add quality pills.
3. **Views & data ergonomics** — Overview dashboard, per-connection scoping, and
   grouping/filter/density + search on Live Values.
4. **Alerting** — thresholds and alert affordances (cards/rows go warn/critical,
   KPI "active alerts" lights up). This is where the redesign meets the README's
   stated non-goal of alerting — the UI is designed to receive it.

> Charting can start hand-rolled (as the mockup does, in plain canvas/SVG — no
> new dependency) and only adopt a library if the chart needs outgrow that.
