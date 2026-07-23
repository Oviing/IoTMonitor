import React from 'react';
import { toNumber, toNumbers } from '../../lib/format.js';
import { EmptyChart } from './LineChart.jsx';

const CX = 100;
const CY = 100;
const R = 84;
const STROKE = 13;

/** Point on the upper semicircle at fraction f (0 = left, 1 = right). */
function pointAt(f) {
  const a = Math.PI * (1 - Math.min(1, Math.max(0, f)));
  return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) };
}

/** SVG arc path between two fractions along the semicircle. */
function arc(f0, f1) {
  const p0 = pointAt(f0);
  const p1 = pointAt(f1);
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${R} ${R} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

/**
 * Radial gauge for a bounded process value. The socket contract carries no
 * min/max metadata (alerting is a non-goal), so the range auto-scales to the
 * min/max observed in `history` and the current value is positioned within it.
 *
 * @param {{ history?: Array<{value:*, ts:number}>, value:*, height?:number }} props
 */
export default function Gauge({ history, value, height = 74 }) {
  const nums = toNumbers(history);
  const cur = toNumber(value);
  if (!Number.isFinite(cur) || nums.length < 1) return <EmptyChart height={height} />;

  const min = Math.min(...nums, cur);
  const max = Math.max(...nums, cur);
  const span = max - min || 1;
  const frac = (cur - min) / span;

  return (
    <svg
      className="chart gauge"
      viewBox="0 0 200 116"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Gauge, ${cur}`}
    >
      {/* track */}
      <path d={arc(0, 1)} fill="none" stroke="var(--surface-3)" strokeWidth={STROKE} strokeLinecap="round" />
      {/* value fill */}
      <path
        d={arc(0, Math.max(0.001, frac))}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <text x={CX} y={CY - 6} textAnchor="middle" className="gauge-frac">
        {Math.round(frac * 100)}%
      </text>
    </svg>
  );
}
