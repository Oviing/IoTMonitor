import React, { useId } from 'react';
import { toNumbers } from '../../lib/format.js';

const W = 300;
const PAD = 6;

/**
 * Line / area trace for numeric history. Renders a faint horizontal grid, the
 * trace, and an emphasized endpoint dot. With `fill` it becomes the area-trace
 * variant (gradient under the line) used for continuous waveforms.
 *
 * Colour comes from the SVG's `currentColor`, set by the parent card via CSS,
 * so it themes automatically. The viewBox scales to the card width while
 * `vector-effect` keeps stroke weight constant.
 *
 * @param {{ history?: Array<{value:*, ts:number}>, height?:number, fill?:boolean }} props
 */
export default function LineChart({ history, height = 74, fill = false }) {
  const gradId = useId();
  const nums = toNumbers(history);
  if (nums.length < 2) return <EmptyChart height={height} />;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const step = W / (nums.length - 1);
  const pts = nums.map((n, i) => ({
    x: i * step,
    y: PAD + (1 - (n - min) / span) * (height - 2 * PAD),
  }));

  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${pts[0].x.toFixed(1)},${height} ${line} ${pts[pts.length - 1].x.toFixed(1)},${height}`;
  const last = pts[pts.length - 1];

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend chart"
    >
      <GridLines height={height} />
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.33" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill={`url(#${gradId})`} stroke="none" />
        </>
      )}
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r="3" fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function GridLines({ height }) {
  return (
    <>
      {[1, 2, 3].map((i) => {
        const y = (height * i) / 4;
        return (
          <line
            key={i}
            x1="0"
            x2={W}
            y1={y}
            y2={y}
            stroke="var(--grid)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </>
  );
}

export function EmptyChart({ height }) {
  return (
    <div className="chart chart-empty muted" style={{ height }}>
      gathering samples…
    </div>
  );
}
