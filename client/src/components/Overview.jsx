/**
 * Overview — the default view. A KPI strip summarising live state over a
 * responsive grid of MetricCards (one per watched signal). All KPIs are
 * derived from real, observable data — there is no threshold/alert engine
 * (a stated non-goal), so the fourth tile reports *stale* signals rather
 * than invented alerts.
 */
import React from 'react';
import MetricCard from './MetricCard.jsx';

export default function Overview({ values, connections, updatesPerSec, now, query, theme, onRemove }) {
  const q = query.trim().toLowerCase();
  const shown = q ? values.filter((v) => v.label.toLowerCase().includes(q)) : values;

  const totalConns = connections.length;
  const activeConns = connections.filter((c) => c.status === 'connected').length;
  const opcuaCount = values.filter((v) => v.source === 'opcua').length;
  const mqttCount = values.filter((v) => v.source === 'mqtt').length;
  const staleCount = values.filter((v) => v.lastTs && now - v.lastTs > 15000).length;

  return (
    <section className="view">
      <div className="view-title">
        <h2>Overview</h2>
        <p>{values.length} watched signal{values.length === 1 ? '' : 's'} across {activeConns} live connection{activeConns === 1 ? '' : 's'}</p>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="micro">Active connections</span>
          <span className="val">
            {activeConns}
            <span style={{ fontSize: '15px', color: 'var(--text-mute)' }}> / {totalConns}</span>
          </span>
          <span className="sub">{totalConns - activeConns} not connected</span>
        </div>
        <div className="kpi">
          <span className="micro">Watched signals</span>
          <span className="val">{values.length}</span>
          <span className="sub">{opcuaCount} OPC UA · {mqttCount} MQTT</span>
        </div>
        <div className="kpi">
          <span className="micro">Updates / sec</span>
          <span className="val">{updatesPerSec}</span>
          <span className="sub">rolling, last second</span>
        </div>
        <div className={`kpi ${staleCount > 0 ? 'alarm' : ''}`}>
          <span className="micro">Stale signals</span>
          <span className="val">{staleCount}</span>
          <span className="sub">no update in 15s+</span>
        </div>
      </div>

      {values.length === 0 ? (
        <div className="empty-hint">
          <p>No signals watched yet. Connect a source, open the <strong>Explorer</strong>, and watch OPC UA tags or subscribe to MQTT topics.</p>
          <p className="muted">
            Tip: run <code>npm run demo-opcua</code> and add <code>opc.tcp://localhost:4840</code> to try it out.
          </p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty-hint">
          <p>No signals match “{query}”.</p>
        </div>
      ) : (
        <div className="cards">
          {shown.map((v) => (
            <MetricCard
              key={`${v.connId}::${v.id}`}
              record={v}
              now={now}
              theme={theme}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
}
