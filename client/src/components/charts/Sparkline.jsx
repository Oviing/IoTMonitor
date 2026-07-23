import React from 'react';
import { toNumbers } from '../../lib/format.js';

/**
 * Compact inline trend line — the original table sparkline, unchanged in spirit
 * (numeric-only, renders "—" when it can't plot two points). Reused in the Live
 * Values table's Trend column.
 *
 * @param {{ history?: Array<{value:*, ts:number}>, width?:number, height?:number }} props
 */
export default function Sparkline({ history, width = 90, height = 24 }) {
  const nums = toNumbers(history);
  if (nums.length < 2) return <span className="muted">—</span>;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const step = width / (nums.length - 1);
  const points = nums
    .map((n, i) => `${(i * step).toFixed(1)},${(height - ((n - min) / span) * height).toFixed(1)}`)
    .join(' ');

  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
