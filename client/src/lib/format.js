/**
 * Shared formatting + numeric-coercion helpers.
 *
 * Values crossing the socket are JSON-safe but loosely typed: OPC UA numeric
 * tags arrive as numbers, MQTT payloads always as strings, booleans as booleans.
 * These helpers give every visualization one consistent way to read them.
 */

/** Format an epoch-ms timestamp as a local time string. */
export const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString() : '—');

/** Format any value for display in a readout / table cell. */
export const fmtValue = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'ON' : 'OFF';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

/**
 * Relative "time ago" for a timestamp, coarse by design (seconds → minutes →
 * hours). Returns 'just now' under a second.
 */
export const fmtAgo = (ts) => {
  if (!ts) return '—';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 1) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
};

/** Coerce a single value to a finite number, or NaN if it isn't numeric. */
export const toNumber = (v) => {
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
};

/** Coerce a value to a boolean (handles true/false, 1/0, "true"/"1"/"on"). */
export const toBool = (v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'on';
};

/**
 * Map a history array (`{ value, ts }[]`) to finite numbers only — the guard
 * every numeric chart shares (mirrors the original Sparkline).
 */
export const toNumbers = (history) =>
  (history ?? []).map((h) => toNumber(h.value)).filter((n) => Number.isFinite(n));
