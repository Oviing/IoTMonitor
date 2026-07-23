import React from 'react';

const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString() : '—');

const fmtValue = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export default function LiveValues({ values, onRemove }) {
  const sorted = [...values].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <section className="panel live-values">
      <div className="panel-head">
        <h3>Live Values</h3>
        <span className="muted">{sorted.length} subscribed</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Tag / Topic</th>
              <th>Value</th>
              <th>Type</th>
              <th>Trend</th>
              <th>Last changed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="muted pad center">
                  Subscribe to OPC UA tags or MQTT topics to see live values here.
                </td>
              </tr>
            )}
            {sorted.map((v) => (
              <tr key={`${v.connId}::${v.id}`}>
                <td>
                  <span className={`src-badge ${v.source}`}>{v.source}</span>
                </td>
                <td className="mono ellipsis" title={v.label}>
                  {v.label}
                </td>
                <td className="mono">
                  {/* keying on lastTs remounts the cell so the flash animation replays */}
                  <span key={v.lastTs} className={v.flash ? 'value flash' : 'value'}>
                    {fmtValue(v.value)}
                  </span>
                </td>
                <td className="muted">{v.dataType}</td>
                <td>
                  <Sparkline history={v.history} />
                </td>
                <td className="muted">{fmtTime(v.lastChanged)}</td>
                <td>
                  <button
                    className="btn edit danger"
                    title="Remove from view"
                    onClick={() => onRemove(v.connId, v.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Sparkline({ history }) {
  const nums = (history ?? [])
    .map((h) => (typeof h.value === 'number' ? h.value : Number(h.value)))
    .filter((n) => Number.isFinite(n));
  if (nums.length < 2) return <span className="muted">—</span>;

  const w = 90;
  const h = 24;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const step = w / (nums.length - 1);
  const points = nums
    .map((n, i) => `${(i * step).toFixed(1)},${(h - ((n - min) / span) * h).toFixed(1)}`)
    .join(' ');

  return (
    <svg className="sparkline" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" strokeWidth="1.5" />
    </svg>
  );
}
