/**
 * Chart — a tiny dependency-free canvas visualization for a value's history.
 *
 * Renders one of three kinds, chosen by the caller from the value's type:
 *   - 'line'  numeric trend (integers / discrete)
 *   - 'area'  numeric trend with an accent fill (continuous / waveforms)
 *   - 'bool'  on/off state timeline
 *
 * History is the per-key ring buffer from App.jsx: [{ value, ts }, …].
 * Colors are read from CSS custom properties at draw time, so the chart
 * follows the active light/dark theme. It redraws on data, size, and theme
 * changes only (no animation loop) — which is naturally reduced-motion safe.
 */
import React, { useEffect, useRef } from 'react';

const num = (v) => (typeof v === 'number' ? v : Number(v));

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
}

export default function Chart({
  history,
  kind = 'line',
  colorVar = '--accent',
  height = 72,
  width, // optional fixed width (px); otherwise fills the container
  theme, // included only to trigger a redraw when the theme changes
}) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = width || canvas.clientWidth || 120;
      const h = height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const color = cssVar(colorVar);
      const gridColor = cssVar('--grid');
      const muteColor = cssVar('--text-mute');

      if (kind === 'bool') {
        drawBool(ctx, history, w, h, color, gridColor, muteColor);
      } else {
        drawTrend(ctx, history, w, h, color, gridColor, kind === 'area');
      }
    };

    draw();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    if (ro) ro.observe(canvas);
    return () => ro && ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, kind, colorVar, height, width, theme]);

  return (
    <canvas
      ref={ref}
      className="chart-canvas"
      style={{ height: `${height}px`, width: width ? `${width}px` : '100%' }}
      aria-hidden="true"
    />
  );
}

function points(nums, w, h, pad) {
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const step = nums.length > 1 ? w / (nums.length - 1) : w;
  return nums.map((n, i) => ({
    x: i * step,
    y: pad + (1 - (n - min) / span) * (h - 2 * pad),
  }));
}

function drawTrend(ctx, history, w, h, color, gridColor, fill) {
  const nums = (history ?? []).map((d) => num(d.value)).filter(Number.isFinite);
  if (nums.length < 2) {
    ctx.fillStyle = gridColor;
    ctx.fillRect(0, h / 2 - 0.5, w, 1);
    return;
  }
  // faint grid
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    const y = Math.round((h * i) / 4) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const pad = 5;
  const P = points(nums, w, h, pad);
  if (fill) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, color + '55');
    g.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.moveTo(P[0].x, h);
    P.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(P[P.length - 1].x, h);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.beginPath();
  P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  const last = P[P.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
  ctx.strokeStyle = color + '66';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function truthy(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return v === 'true' || v === '1' || v === 1;
}

function drawBool(ctx, history, w, h, color, gridColor, muteColor) {
  const vals = (history ?? []).map((d) => truthy(d.value));
  const midY = h / 2;
  const bh = Math.min(14, h / 2 - 2);
  ctx.strokeStyle = gridColor;
  ctx.beginPath();
  ctx.moveTo(0, midY + 0.5);
  ctx.lineTo(w, midY + 0.5);
  ctx.stroke();
  if (vals.length < 1) return;
  const step = vals.length > 1 ? w / (vals.length - 1) : w;
  for (let i = 0; i < vals.length; i += 1) {
    if (vals[i]) {
      ctx.fillStyle = color + 'cc';
      ctx.fillRect(i * step, midY - bh, step + 1, bh);
    } else {
      ctx.fillStyle = muteColor + '44';
      ctx.fillRect(i * step, midY + 2, step + 1, bh);
    }
  }
}
