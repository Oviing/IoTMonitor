import React from 'react';
import { toNumbers } from '../../lib/format.js';
import { GridLines, EmptyChart } from './LineChart.jsx';

const W = 300;
const PAD = 6;

/**
 * Column chart for numeric history — bars scaled between the window's min and
 * max, useful for discrete/counter-style signals. Colour via `currentColor`.
 *
 * @param {{ history?: Array<{value:*, ts:number}>, height?:number }} props
 */
export default function BarChart({ history, height = 74 }) {
  const nums = toNumbers(history);
  if (nums.length < 1) return <EmptyChart height={height} />;

  const min = Math.min(...nums, 0);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const slot = W / nums.length;
  const barW = Math.max(1, slot * 0.72);

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Bar chart"
    >
      <GridLines height={height} />
      {nums.map((n, i) => {
        const h = ((n - min) / span) * (height - 2 * PAD);
        const x = i * slot + (slot - barW) / 2;
        const y = height - PAD - h;
        const last = i === nums.length - 1;
        return (
          <rect
            key={i}
            x={x.toFixed(1)}
            y={y.toFixed(1)}
            width={barW.toFixed(1)}
            height={Math.max(0, h).toFixed(1)}
            fill="currentColor"
            fillOpacity={last ? '1' : '0.55'}
          />
        );
      })}
    </svg>
  );
}
