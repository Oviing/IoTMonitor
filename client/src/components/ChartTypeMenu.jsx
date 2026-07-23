import React from 'react';
import { CHART_TYPES, CHART_LABELS } from '../lib/chartType.js';

/**
 * Chart-type picker — a compact native `<select>` used in two places:
 *   • globally (Overview toolbar) to set the default for every "auto" card, and
 *   • per-card to override one signal.
 * `allowed` restricts the concrete options to the types that make sense for a
 * signal ('auto' is always offered).
 *
 * @param {{
 *   value:string,
 *   onChange:(type:string)=>void,
 *   allowed?:string[],
 *   label?:string,
 *   compact?:boolean
 * }} props
 */
export default function ChartTypeMenu({ value, onChange, allowed, label, compact = false }) {
  const options = CHART_TYPES.filter((t) => t === 'auto' || !allowed || allowed.includes(t));
  return (
    <label className={`chart-menu${compact ? ' compact' : ''}`}>
      {label && <span className="micro">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label || 'Chart type'}
      >
        {options.map((t) => (
          <option key={t} value={t}>
            {CHART_LABELS[t]}
          </option>
        ))}
      </select>
    </label>
  );
}
