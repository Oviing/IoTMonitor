/**
 * Chart-type catalogue + resolution logic.
 *
 * A monitored value can be drawn several ways; this module names the available
 * types, picks a sensible default from a value's data type, and reports which
 * types actually make sense for a given signal (so the picker can disable the
 * nonsensical ones — e.g. a gauge for a boolean).
 */
import { toNumber } from './format.js';

/** Concrete chart types plus the special 'auto' sentinel. */
export const CHART_TYPES = ['auto', 'line', 'area', 'bar', 'gauge', 'boolean', 'sparkline'];

/** Human labels for the picker. */
export const CHART_LABELS = {
  auto: 'Auto',
  line: 'Line',
  area: 'Area',
  bar: 'Bar',
  gauge: 'Gauge',
  boolean: 'Boolean',
  sparkline: 'Sparkline',
};

const INT_TYPES = /int|byte|sbyte|integer/i;
// OPC UA numeric DataType identifiers for integer types (Int32 arrives as "6",
// Double as "11", etc. when the server reports the id rather than the name).
const INT_TYPE_IDS = new Set(['2', '3', '4', '5', '6', '7', '8', '9', '27', '28', '29']);

function isIntegerType(dataType) {
  const dt = String(dataType || '');
  return INT_TYPES.test(dt) || INT_TYPE_IDS.has(dt);
}

/** True when a record's value reads as a boolean signal. */
export function isBooleanRecord(record) {
  if (!record) return false;
  if (typeof record.value === 'boolean') return true;
  return /bool/i.test(record.dataType || '');
}

/** True when a record's current value (or recent history) is numeric. */
export function isNumericRecord(record) {
  if (!record) return false;
  if (Number.isFinite(toNumber(record.value))) return true;
  return (record.history ?? []).some((h) => Number.isFinite(toNumber(h.value)));
}

/**
 * The default chart for a signal, mirroring the mockup's mapping:
 * boolean → boolean timeline, integer/counter → line, continuous double → area,
 * anything non-numeric → sparkline (which itself renders "—" when it can't plot).
 */
export function defaultChartType(record) {
  if (isBooleanRecord(record)) return 'boolean';
  if (isNumericRecord(record)) {
    return isIntegerType(record.dataType) ? 'line' : 'area';
  }
  return 'sparkline';
}

/** Which concrete types are meaningful for this signal (excludes 'auto'). */
export function applicableTypes(record) {
  if (isBooleanRecord(record)) return ['boolean', 'sparkline'];
  if (isNumericRecord(record)) return ['line', 'area', 'bar', 'gauge', 'sparkline'];
  return ['sparkline'];
}

/**
 * Resolve a stored preference (which may be 'auto') to a concrete chart type
 * for a specific record.
 */
export function resolveChartType(pref, record) {
  const type = pref && pref !== 'auto' ? pref : defaultChartType(record);
  // Guard against a stale override that no longer fits the data (e.g. a signal
  // that used to be numeric now arriving as text).
  return applicableTypes(record).includes(type) ? type : defaultChartType(record);
}
