import React from 'react';
import { toBool } from '../../lib/format.js';
import { EmptyChart } from './LineChart.jsx';

const W = 300;

/**
 * On/off state band for boolean signals: each history sample is a segment —
 * "on" draws an accent bar above the midline, "off" a muted bar below — so the
 * switching history reads at a glance. Colour via `currentColor`.
 *
 * @param {{ history?: Array<{value:*, ts:number}>, height?:number }} props
 */
export default function BooleanTimeline({ history, height = 74 }) {
  const states = (history ?? []).map((h) => toBool(h.value));
  if (states.length < 1) return <EmptyChart height={height} />;

  const midY = height / 2;
  const bh = Math.min(16, height / 2 - 4);
  const step = W / states.length;

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Boolean state timeline"
    >
      <line x1="0" x2={W} y1={midY} y2={midY} stroke="var(--grid)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {states.map((on, i) => (
        <rect
          key={i}
          x={(i * step).toFixed(1)}
          y={on ? midY - bh : midY + 2}
          width={(step + 0.5).toFixed(1)}
          height={bh}
          fill={on ? 'currentColor' : 'var(--text-mute)'}
          fillOpacity={on ? '0.85' : '0.3'}
        />
      ))}
    </svg>
  );
}
