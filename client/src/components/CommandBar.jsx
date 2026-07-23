import React from 'react';

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'live', label: 'Live Values' },
  { id: 'explorer', label: 'Explorer' },
];

/**
 * Top command bar: brand, global tag/topic search, the view switch (tablist),
 * the server-connection pill, and the light/dark theme toggle. Replaces the
 * bare app header.
 *
 * @param {{
 *   connected:boolean,
 *   view:string,
 *   onViewChange:(v:string)=>void,
 *   search:string,
 *   onSearch:(s:string)=>void,
 *   theme:('light'|'dark'),
 *   onToggleTheme:()=>void
 * }} props
 */
export default function CommandBar({ connected, view, onViewChange, search, onSearch, theme, onToggleTheme }) {
  return (
    <header className="cmdbar">
      <div className="brand">
        <span className="diamond">◆</span> IoTMonitor
      </div>

      <label className="search">
        <span aria-hidden="true">⌕</span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search tags & topics…"
          aria-label="Search tags and topics"
        />
      </label>

      <nav className="viewswitch" role="tablist" aria-label="View">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            onClick={() => onViewChange(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <div className="cmd-right">
        <span className={`server-pill ${connected ? 'up' : 'down'}`}>
          <span className="live" />
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
