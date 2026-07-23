import React, { useEffect, useMemo, useRef, useState } from 'react';
import { socket } from './api/socket.js';
import CommandBar from './components/CommandBar.jsx';
import ConnectionManager from './components/ConnectionManager.jsx';
import OverviewView from './components/views/OverviewView.jsx';
import LiveValuesView from './components/views/LiveValuesView.jsx';
import ExplorerView from './components/views/ExplorerView.jsx';
import { useTheme } from './hooks/useTheme.js';
import { useChartPrefs } from './hooks/useChartPrefs.js';

const HISTORY_CAP = 60;
const keyFor = (connId, id) => `${connId}::${id}`;

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [connections, setConnections] = useState([]);
  // liveValues: Map key -> value record. Kept in a ref for high-frequency updates,
  // mirrored into state via a version counter to trigger re-renders.
  const liveRef = useRef(new Map());
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => (t + 1) % 1_000_000);
  const [activeOpcua, setActiveOpcua] = useState(null); // connId currently browsing
  const [activeMqtt, setActiveMqtt] = useState(null);

  // shell UI state
  const [view, setView] = useState('overview');
  const [search, setSearch] = useState('');
  const [theme, toggleTheme] = useTheme();
  const prefs = useChartPrefs();

  // rolling updates/sec counter for the Overview KPI (ref = hot path, sampled 1/s)
  const updateCounter = useRef(0);
  const [updatesPerSec, setUpdatesPerSec] = useState(0);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnections = (list) => setConnections(list);
    const onStatus = ({ connId, status, message }) => {
      setConnections((prev) =>
        prev.map((c) => (c.id === connId ? { ...c, status, statusMessage: message } : c))
      );
    };

    const upsert = (key, patch) => {
      const map = liveRef.current;
      const prev = map.get(key);
      const record = { ...prev, ...patch };
      const nextHistory = (prev?.history ?? []).concat({
        value: patch.value,
        ts: patch.lastTs,
      });
      record.history = nextHistory.slice(-HISTORY_CAP);
      map.set(key, record);
      updateCounter.current += 1;
      bump();
    };

    const onOpcuaValue = (p) => {
      upsert(keyFor(p.connId, p.nodeId), {
        source: 'opcua',
        connId: p.connId,
        id: p.nodeId,
        label: p.nodeId,
        value: p.value,
        dataType: p.dataType,
        quality: p.quality,
        lastTs: p.sourceTs,
        lastChanged: p.changed ? p.sourceTs : liveRef.current.get(keyFor(p.connId, p.nodeId))?.lastChanged,
        flash: p.changed,
      });
    };
    const onMqttMessage = (p) => {
      const prevRec = liveRef.current.get(keyFor(p.connId, p.topic));
      upsert(keyFor(p.connId, p.topic), {
        source: 'mqtt',
        connId: p.connId,
        id: p.topic,
        label: p.topic,
        value: p.payload,
        dataType: 'string',
        lastTs: p.ts,
        lastChanged: p.changed ? p.ts : prevRec?.lastChanged,
        flash: p.changed,
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connections', onConnections);
    socket.on('connection:status', onStatus);
    socket.on('opcua:value', onOpcuaValue);
    socket.on('mqtt:message', onMqttMessage);
    socket.emit('connection:list');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connections', onConnections);
      socket.off('connection:status', onStatus);
      socket.off('opcua:value', onOpcuaValue);
      socket.off('mqtt:message', onMqttMessage);
    };
  }, []);

  // sample the update counter once a second (kept off the hot path)
  useEffect(() => {
    const id = setInterval(() => {
      setUpdatesPerSec(updateCounter.current);
      updateCounter.current = 0;
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Recompute the materialized array whenever a value updates (the version
  // counter bumps on every socket upsert), so views see fresh records — not just
  // when the number of signals changes.
  const liveValues = useMemo(() => [...liveRef.current.values()], [tick]);

  const removeLive = (connId, id) => {
    liveRef.current.delete(keyFor(connId, id));
    bump();
  };

  const opcuaConns = connections.filter((c) => c.type === 'opcua');
  const mqttConns = connections.filter((c) => c.type === 'mqtt');
  const isUp = (connId) => connections.find((c) => c.id === connId)?.status === 'connected';

  const openBrowse = (c) => {
    setActiveOpcua(c.id);
    setView('explorer');
  };
  const openMqtt = (c) => {
    setActiveMqtt(c.id);
    setView('explorer');
  };

  const subscribedKeys = liveValues
    .filter((v) => v.source === 'opcua')
    .map((v) => keyFor(v.connId, v.id));

  return (
    <div className="app">
      <CommandBar
        connected={connected}
        view={view}
        onViewChange={setView}
        search={search}
        onSearch={setSearch}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="body">
        <aside className="rail">
          <ConnectionManager
            connections={connections}
            liveValues={liveValues}
            onBrowse={openBrowse}
            onOpenMqtt={openMqtt}
            activeOpcua={activeOpcua}
            activeMqtt={activeMqtt}
          />
        </aside>

        <main className="canvas">
          {view === 'overview' && (
            <OverviewView
              liveValues={liveValues}
              connections={connections}
              updatesPerSec={updatesPerSec}
              search={search}
              prefs={prefs}
              onRemove={removeLive}
            />
          )}
          {view === 'live' && (
            <LiveValuesView
              liveValues={liveValues}
              connections={connections}
              search={search}
              onRemove={removeLive}
            />
          )}
          {view === 'explorer' && (
            <ExplorerView
              activeOpcua={activeOpcua}
              activeMqtt={activeMqtt}
              opcuaConns={opcuaConns}
              mqttConns={mqttConns}
              isUp={isUp}
              subscribedKeys={subscribedKeys}
            />
          )}
        </main>
      </div>
    </div>
  );
}
