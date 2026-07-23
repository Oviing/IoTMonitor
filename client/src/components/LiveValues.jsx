/**
 * LiveValues — the unified table of every watched tag/topic. Upgrades the
 * original table with a filter (driven by the command-bar search), a density
 * toggle, grouping by connection, an OPC UA quality cell, an inline canvas
 * trend, and relative last-changed times. Presentation only — same records
 * as the Overview cards.
 */
import React, { useState } from 'react';
import Chart from './Chart.jsx';
import { fmtValue, relTime, chartKind, colorVarFor } from '../format.js';

export default function LiveValues({ values, onRemove, query, connections, now, theme }) {
  const [compact, setCompact] = useState(false);
  const [grouped, setGrouped] = useState(true);

  const q = query.trim().toLowerCase();
  const filtered = q ? values.filter((v) => v.label.toLowerCase().includes(q)) : values;
  const sorted = [...filtered].sort((a, b) => a.label.localeCompare(b.label));

  const nameFor = (connId) => connections.find((c) => c.id === connId)?.name || connId;

  // Build render groups (by connection) or a single flat group.
  const groups = [];
  if (grouped) {
    const byConn = new Map();
    sorted.forEach((v) => {
      if (!byConn.has(v.connId)) byConn.set(v.connId, []);
      byConn.get(v.connId).push(v);
    });
    byConn.forEach((rows, connId) => groups.push({ connId, name: nameFor(connId), rows }));
    groups.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    groups.push({ connId: null, name: null, rows: sorted });
  }

  return (
    <section className={`view live-values ${compact ? 'compact' : ''}`}>
      <div className="view-title">
        <h2>Live Values</h2>
        <p>{sorted.length} of {values.length} signal{values.length === 1 ? '' : 's'}</p>
      </div>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Density">
          <button aria-pressed={!compact} onClick={() => setCompact(false)}>Comfortable</button>
          <button aria-pressed={compact} onClick={() => setCompact(true)}>Compact</button>
        </div>
        <div className="seg" role="group" aria-label="Grouping">
          <button aria-pressed={grouped} onClick={() => setGrouped(true)}>Group: Connection</button>
          <button aria-pressed={!grouped} onClick={() => setGrouped(false)}>Flat</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Tag / Topic</th>
              <th>Value</th>
              <th>Type</th>
              <th>Quality</th>
              <th>Trend</th>
              <th>Last changed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="muted pad center">
                  {values.length === 0
                    ? 'Subscribe to OPC UA tags or MQTT topics to see live values here.'
                    : `No signals match “${query}”.`}
                </td>
              </tr>
            )}
            {groups.map((g) => (
              <React.Fragment key={g.connId || 'flat'}>
                {g.name && (
                  <tr className="grouprow">
                    <td colSpan={8}>
                      <span className="micro">
                        <span className={`dot ${connections.find((c) => c.id === g.connId)?.status || 'disconnected'}`} />
                        {g.name} · {g.rows.length} signal{g.rows.length === 1 ? '' : 's'}
                      </span>
                    </td>
                  </tr>
                )}
                {g.rows.map((v) => (
                  <tr key={`${v.connId}::${v.id}`}>
                    <td><span className={`src-badge ${v.source}`}>{v.source}</span></td>
                    <td><span className="tagname ellipsis" title={v.label}>{v.label}</span></td>
                    <td>
                      {/* keying on lastTs remounts the cell so the flash animation replays */}
                      <span key={v.lastTs} className={v.flash ? 'value flash' : 'value'}>
                        {fmtValue(v.value)}
                      </span>
                    </td>
                    <td><span className="dtype">{v.dataType}</span></td>
                    <td><QualityCell record={v} /></td>
                    <td>
                      <Chart
                        history={v.history}
                        kind={chartKind(v)}
                        colorVar={colorVarFor(v)}
                        theme={theme}
                        height={26}
                        width={96}
                      />
                    </td>
                    <td><span className="ago">{relTime(v.lastChanged, now)}</span></td>
                    <td>
                      <button className="x" title="Remove from view" aria-label="Remove" onClick={() => onRemove(v.connId, v.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QualityCell({ record }) {
  if (record.source !== 'opcua') return <span className="muted">—</span>;
  const q = record.quality || 'Good';
  const cls = q === 'Good' ? 'good' : q === 'Bad' ? 'bad' : 'warn';
  return <span className={`pill ${cls}`}>{q}</span>;
}
