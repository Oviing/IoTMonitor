import React, { useState } from 'react';
import LiveValues from '../LiveValues.jsx';

/**
 * The Live Values view: a toolbar (filter box, density toggle, group toggle)
 * over the upgraded live table. The command-bar search and the local filter box
 * both narrow the rows (AND). The table's live-update / flash behaviour is
 * unchanged from the original.
 *
 * @param {{
 *   liveValues:object[],
 *   connections:object[],
 *   search:string,
 *   onRemove:(connId:string,id:string)=>void
 * }} props
 */
export default function LiveValuesView({ liveValues, connections, search, onRemove }) {
  const [filter, setFilter] = useState('');
  const [density, setDensity] = useState('comfortable');
  const [groupBy, setGroupBy] = useState('connection');

  const g = search.trim().toLowerCase();
  const f = filter.trim().toLowerCase();
  const rows = liveValues.filter((v) => {
    const label = v.label.toLowerCase();
    return (!g || label.includes(g)) && (!f || label.includes(f));
  });

  return (
    <section className="view">
      <div className="view-title">
        <h2>Live Values</h2>
        <p>All watched tags &amp; topics, updating in real time</p>
      </div>

      <div className="toolbar">
        <label className="filter">
          <span aria-hidden="true">⌕</span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by tag or topic…"
            aria-label="Filter rows"
          />
        </label>
        <div className="seg" role="group" aria-label="Density">
          <button aria-pressed={density === 'comfortable'} onClick={() => setDensity('comfortable')}>
            Comfortable
          </button>
          <button aria-pressed={density === 'compact'} onClick={() => setDensity('compact')}>
            Compact
          </button>
        </div>
        <div className="seg" role="group" aria-label="Group by">
          <button aria-pressed={groupBy === 'connection'} onClick={() => setGroupBy('connection')}>
            Group: Connection
          </button>
          <button aria-pressed={groupBy === 'flat'} onClick={() => setGroupBy('flat')}>
            Flat
          </button>
        </div>
      </div>

      <LiveValues
        values={rows}
        connections={connections}
        density={density}
        groupBy={groupBy}
        onRemove={onRemove}
      />
    </section>
  );
}
