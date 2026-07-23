/**
 * MetricCard — a per-signal "instrument": protocol badge, label, a large
 * mono readout that flashes on change, a type-appropriate Chart, and the
 * data type + last-changed footer. Renders the same live record the Live
 * Values table uses.
 */
import React from 'react';
import Chart from './Chart.jsx';
import { fmtValue, fmtReadout, relTime, chartKind, colorVarFor, isBooleanValue } from '../format.js';

export default function MetricCard({ record, now, theme, onRemove }) {
  const kind = chartKind(record);
  const isBool = isBooleanValue(record);
  const stale = record.lastTs && now - record.lastTs > 15000;
  const boolOn = isBool && (record.value === true || record.value === 1 || record.value === 'true');

  return (
    <div className="card">
      <div className={`card-stripe ${stale ? 'stale' : ''}`} />
      <div className="card-hd">
        <span className={`src-badge ${record.source}`}>{record.source === 'opcua' ? 'OPC UA' : 'MQTT'}</span>
        <span className="title" title={record.label}>{record.label}</span>
        <button
          className="x"
          title="Remove from view"
          aria-label="Remove from view"
          onClick={() => onRemove(record.connId, record.id)}
        >
          ✕
        </button>
      </div>
      <div className="card-body">
        <div className="readout">
          {isBool ? (
            <span key={record.lastTs} className={`boolstate ${boolOn ? 'on' : 'off'} ${record.flash ? 'flash' : ''}`}>
              {boolOn ? 'ON' : 'OFF'}
            </span>
          ) : (
            <span key={record.lastTs} className={`num ${record.flash ? 'flash' : ''}`} title={fmtValue(record.value)}>
              {fmtReadout(record.value)}
            </span>
          )}
          <span className="qual">
            <span className={`pill ${stale ? 'muted' : 'good'}`}>{stale ? 'stale' : 'live'}</span>
          </span>
        </div>
        <Chart history={record.history} kind={kind} colorVar={colorVarFor(record)} theme={theme} height={72} />
        <div className="card-ft">
          <span>{record.dataType || '—'}</span>
          <span>{relTime(record.lastChanged || record.lastTs, now)} ago</span>
        </div>
      </div>
    </div>
  );
}
