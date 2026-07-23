/**
 * CommandBar — the top control strip: brand, global tag/topic search, the
 * Overview / Live Values / Explorer view switch, the server-connection pill,
 * and the light/dark theme toggle.
 */
import React from 'react';

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'live', label: 'Live Values' },
  { id: 'explorer', label: 'Explorer' },
];

export default function CommandBar({ view, onView, query, onQuery, connected, theme, onToggleTheme }) {
  return (
    <header className="cmdbar">
      <div className="brand">
        <span className="diamond" aria-hidden="true">◆</span> IoTMonitor <small>live</small>
      </div>

      <label className="search">
        <span aria-hidden="true">⌕</span>
        <input
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search tags &amp; topics…"
          aria-label="Search tags and topics"
        />
      </label>

      <nav className="viewswitch" role="tablist" aria-label="View">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            onClick={() => onView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <div className="cmd-right">
        <span className={`server-pill ${connected ? '' : 'down'}`}>
          <span className="live" aria-hidden="true" />
          {connected ? 'server connected' : 'server offline'}
        </span>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title="Toggle light / dark"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
