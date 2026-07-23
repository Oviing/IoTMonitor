import React from 'react';
import KpiTile from '../KpiTile.jsx';
import MetricCard from '../MetricCard.jsx';
import ChartTypeMenu from '../ChartTypeMenu.jsx';
import { resolveChartType, applicableTypes } from '../../lib/chartType.js';

const keyFor = (connId, id) => `${connId}::${id}`;

/**
 * The default dashboard: a KPI strip over a responsive grid of live metric
 * cards, one per watched signal, each drawn with its resolved chart type.
 * Hosts the global chart-type default (applies to every card left on "Auto").
 *
 * @param {{
 *   liveValues:object[],
 *   connections:object[],
 *   updatesPerSec:number,
 *   search:string,
 *   prefs:object,
 *   onRemove:(connId:string,id:string)=>void
 * }} props
 */
export default function OverviewView({ liveValues, connections, updatesPerSec, search, prefs, onRemove }) {
  const q = search.trim().toLowerCase();
  const shown = q ? liveValues.filter((v) => v.label.toLowerCase().includes(q)) : liveValues;
  const sorted = [...shown].sort((a, b) => a.label.localeCompare(b.label));

  const connectedCount = connections.filter((c) => c.status === 'connected').length;
  const opcuaCount = liveValues.filter((v) => v.source === 'opcua').length;
  const mqttCount = liveValues.filter((v) => v.source === 'mqtt').length;

  return (
    <section className="view">
      <div className="view-title">
        <h2>Overview</h2>
        <p>{liveValues.length} watched signals, live</p>
      </div>

      <div className="kpis">
        <KpiTile
          label="Active connections"
          value={
            <>
              {connectedCount}
              <span className="kpi-den"> / {connections.length}</span>
            </>
          }
          sub={connections.length ? `${connections.length - connectedCount} offline` : 'none configured'}
        />
        <KpiTile
          label="Watched signals"
          value={liveValues.length}
          sub={`${opcuaCount} OPC UA · ${mqttCount} MQTT`}
        />
        <KpiTile label="Updates / sec" value={updatesPerSec} sub="live stream" />
        <KpiTile label="Active alerts" value={0} sub="none" />
      </div>

      <div className="overview-toolbar">
        <h3>Live signals</h3>
        <ChartTypeMenu
          value={prefs.globalDefault}
          onChange={prefs.setGlobalDefault}
          label="Default chart"
        />
      </div>

      {sorted.length === 0 ? (
        <div className="empty-hint">
          <p>No watched signals yet.</p>
          <p className="muted">
            Open <b>Explorer</b> to browse an OPC UA server or subscribe to MQTT topics.
          </p>
        </div>
      ) : (
        <div className="cards">
          {sorted.map((v) => {
            const key = keyFor(v.connId, v.id);
            const override = prefs.overrides[key];
            const effective = override ?? prefs.globalDefault;
            const resolved = resolveChartType(effective, v);
            return (
              <MetricCard
                key={key}
                record={v}
                resolvedType={resolved}
                menuValue={override ?? 'auto'}
                allowed={applicableTypes(v)}
                onChangeType={(type) => prefs.setOverride(key, type)}
                onRemove={() => onRemove(v.connId, v.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
