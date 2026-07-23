import React from 'react';

/**
 * A single KPI stat tile: a micro label, a big tabular-mono number, and an
 * optional sub-line. `alarm` tints it for the "active alerts" tile.
 *
 * @param {{ label:string, value:React.ReactNode, sub?:React.ReactNode, alarm?:boolean }} props
 */
export default function KpiTile({ label, value, sub, alarm = false }) {
  return (
    <div className={`kpi${alarm ? ' alarm' : ''}`}>
      <span className="micro">{label}</span>
      <span className="kpi-val mono">{value}</span>
      {sub != null && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}
