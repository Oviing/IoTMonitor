/**
 * Shared presentation helpers for live value records.
 *
 * A live record (built in App.jsx) looks like:
 *   { source, connId, id, label, value, dataType, quality, lastTs,
 *     lastChanged, flash, history: [{ value, ts }, …] }
 */

/** Format a value for display. */
export function fmtValue(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * Compact value for a card's hero readout — rounds long floats to a
 * glanceable precision. Full precision stays in the table and on hover.
 */
export function fmtReadout(v) {
  if (typeof v === 'number' && Number.isFinite(v) && !Number.isInteger(v)) {
    return v.toFixed(3);
  }
  return fmtValue(v);
}

/** Absolute wall-clock time, or an em dash. */
export function fmtTime(ts) {
  return ts ? new Date(ts).toLocaleTimeString() : '—';
}

/** Short relative age like "3s", "2m", "1h". */
export function relTime(ts, now = Date.now()) {
  if (!ts) return '—';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 1) return 'now';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

/** True for values that read as a boolean on/off. */
export function isBooleanValue(record) {
  if (record.dataType === 'Boolean') return true;
  return typeof record.value === 'boolean';
}

/** Whether a record's value is numeric (charts can plot it). */
export function isNumeric(record) {
  const n = typeof record.value === 'number' ? record.value : Number(record.value);
  return Number.isFinite(n);
}

/**
 * Pick the chart kind for a record:
 *   'bool'  booleans → state timeline
 *   'area'  continuous doubles → filled trace
 *   'line'  integers / other numerics → line
 */
export function chartKind(record) {
  if (isBooleanValue(record)) return 'bool';
  const dt = String(record.dataType || '').toLowerCase();
  if (dt.includes('double') || dt.includes('float')) return 'area';
  return 'line';
}

/** CSS custom-property name for a record's protocol color. */
export function colorVarFor(record) {
  return record.source === 'mqtt' ? '--mqtt' : '--opcua';
}
