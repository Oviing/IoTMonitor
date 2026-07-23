import React from 'react';
import ChartSwitch from './charts/ChartSwitch.jsx';
import ChartTypeMenu from './ChartTypeMenu.jsx';
import QualityPill from './QualityPill.jsx';
import { fmtValue, fmtAgo } from '../lib/format.js';
import { isBooleanRecord } from '../lib/chartType.js';

/** Short display title from a nodeId / topic (last path segment). */
function titleOf(label = '') {
  const parts = String(label).split(/[/.]/).filter(Boolean);
  return parts[parts.length - 1] || label;
}

function qualityTone(quality) {
  if (!quality) return 'neutral';
  const q = String(quality).toLowerCase();
  if (q.includes('good')) return 'good';
  if (q.includes('uncertain')) return 'warn';
  return 'bad';
}

/**
 * Per-signal instrument card: source badge, title/node, big mono readout (or
 * ON/OFF for booleans), quality pill, the type-appropriate chart, a per-card
 * chart-type override menu, and a footer (data type + relative last-changed).
 *
 * @param {{
 *   record:object,
 *   resolvedType:string,
 *   menuValue:string,
 *   allowed?:string[],
 *   onChangeType:(type:string)=>void,
 *   onRemove?:()=>void
 * }} props
 */
export default function MetricCard({ record, resolvedType, menuValue, allowed, onChangeType, onRemove }) {
  const isBool = isBooleanRecord(record);
  const tone = qualityTone(record.quality);
  const stripe = tone === 'bad' ? 'bad' : tone === 'warn' ? 'warn' : 'good';
  const colorClass = record.source === 'opcua' ? 'accent-opcua' : 'accent-mqtt';

  return (
    <div className={`card ${colorClass}`}>
      <div className={`card-stripe ${stripe}`} />
      <div className="card-hd">
        <span className={`src-badge ${record.source}`}>{record.source === 'opcua' ? 'OPC UA' : 'MQTT'}</span>
        <span className="card-title" title={record.label}>
          {titleOf(record.label)}
        </span>
        <ChartTypeMenu value={menuValue} onChange={onChangeType} allowed={allowed} compact />
        {onRemove && (
          <button className="btn edit danger" title="Remove from view" onClick={onRemove}>
            ✕
          </button>
        )}
      </div>
      <div className="card-node mono" title={record.label}>
        {record.label}
      </div>
      <div className="card-body">
        <div className="readout">
          {isBool ? (
            <span className={`boolstate mono ${record.value ? 'on' : 'off'}`}>{fmtValue(record.value)}</span>
          ) : (
            <span key={record.lastTs} className={`num mono${record.flash ? ' flash' : ''}`}>
              {fmtValue(record.value)}
            </span>
          )}
          <span className="readout-q">
            <QualityPill quality={record.quality} />
          </span>
        </div>
        <ChartSwitch type={resolvedType} record={record} />
        <div className="card-ft">
          <span className="mono">{record.dataType}</span>
          <span>{fmtAgo(record.lastChanged)}</span>
        </div>
      </div>
    </div>
  );
}
