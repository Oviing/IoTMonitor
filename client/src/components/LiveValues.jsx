import React from 'react';
import Sparkline from './charts/Sparkline.jsx';
import QualityPill from './QualityPill.jsx';
import { fmtTime, fmtValue } from '../lib/format.js';

/**
 * The unified live-values table. Rows update in place; the value cell is keyed
 * on `lastTs` so the flash animation replays on each change (unchanged from the
 * original). Adds a quality column and optional grouping/density presentation.
 *
 * @param {{
 *   values:object[],
 *   connections?:object[],
 *   density?:('comfortable'|'compact'),
 *   groupBy?:('connection'|'flat'),
 *   onRemove:(connId:string,id:string)=>void
 * }} props
 */
export default function LiveValues({ values, connections = [], density = 'comfortable', groupBy = 'flat', onRemove }) {
  const sorted = [...values].sort((a, b) => a.label.localeCompare(b.label));
  const connName = (connId) => connections.find((c) => c.id === connId)?.name || connId;

  const groups =
    groupBy === 'connection'
      ? [...new Set(sorted.map((v) => v.connId))].map((connId) => ({
          connId,
          name: connName(connId),
          rows: sorted.filter((v) => v.connId === connId),
        }))
      : [{ connId: null, name: null, rows: sorted }];

  return (
    <section className="panel live-values">
      <div className="panel-head">
        <h3>Live Values</h3>
        <span className="muted">{sorted.length} subscribed</span>
      </div>
      <div className="table-wrap">
        <table className={density === 'compact' ? 'compact' : ''}>
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
                  Subscribe to OPC UA tags or MQTT topics to see live values here.
                </td>
              </tr>
            )}
            {groups.map((group) => (
              <React.Fragment key={group.connId ?? '__flat__'}>
                {group.name != null && (
                  <tr className="grouprow">
                    <td colSpan={8}>
                      <span className="micro">
                        {group.name} · {group.rows.length} signals
                      </span>
                    </td>
                  </tr>
                )}
                {group.rows.map((v) => (
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
                      <QualityPill quality={v.quality} />
                    </td>
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
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
