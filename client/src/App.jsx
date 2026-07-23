import React, { useEffect, useMemo, useRef, useState } from 'react';
import { socket } from './api/socket.js';
import { getInitialTheme, applyTheme, saveTheme } from './theme.js';
import CommandBar from './components/CommandBar.jsx';
import ConnectionManager from './components/ConnectionManager.jsx';
import OpcuaBrowser from './components/OpcuaBrowser.jsx';
import MqttPanel from './components/MqttPanel.jsx';
import LiveValues from './components/LiveValues.jsx';
import Overview from './components/Overview.jsx';

const HISTORY_CAP = 60;
const keyFor = (connId, id) => `${connId}::${id}`;

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [connections, setConnections] = useState([]);
  // liveValues: Map key -> value record. Kept in a ref for high-frequency updates,
  // mirrored into state via a version counter (tick) to trigger re-renders.
  const liveRef = useRef(new Map());
  // Friendly display names for watched OPC UA nodes, keyed by keyFor(connId, nodeId).
  // Values arrive tagged only by nodeId, so we remember the browse name at watch time.
  const labelsRef = useRef(new Map());
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => (t + 1) % 1_000_000);

  // UI state (presentation only)
  const [view, setView] = useState('overview'); // 'overview' | 'live' | 'explorer'
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState(getInitialTheme);
  const [activeOpcua, setActiveOpcua] = useState(null); // connId currently browsing
  const [activeMqtt, setActiveMqtt] = useState(null);
  const [mqttTopics, setMqttTopics] = useState({}); // { connId: [topic, …] }

  // Derived, real-data KPIs
  const eventCountRef = useRef(0);
  const [updatesPerSec, setUpdatesPerSec] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [srMessage, setSrMessage] = useState('');
  const prevStaleRef = useRef(0);

  // Apply theme to <html> whenever it changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      return next;
    });
  };

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
      eventCountRef.current += 1;
      const map = liveRef.current;
      const prev = map.get(key);
      const record = { ...prev, ...patch };
      const nextHistory = (prev?.history ?? []).concat({
        value: patch.value,
        ts: patch.lastTs,
      });
      record.history = nextHistory.slice(-HISTORY_CAP);
      map.set(key, record);
      bump();
    };

    const onOpcuaValue = (p) => {
      const key = keyFor(p.connId, p.nodeId);
      upsert(key, {
        source: 'opcua',
        connId: p.connId,
        id: p.nodeId,
        label: labelsRef.current.get(key) || p.nodeId,
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

  // Rolling updates/sec + a 1s "now" clock for relative times and stale detection.
  useEffect(() => {
    const iv = setInterval(() => {
      setUpdatesPerSec(eventCountRef.current);
      eventCountRef.current = 0;
      const ts = Date.now();
      setNow(ts);
      const stale = [...liveRef.current.values()].filter((r) => r.lastTs && ts - r.lastTs > 15000).length;
      if (stale !== prevStaleRef.current) {
        prevStaleRef.current = stale;
        setSrMessage(stale > 0 ? `${stale} signal${stale === 1 ? '' : 's'} stale` : 'all signals live');
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Rebuild the array on every tick so updates to existing keys are reflected.
  const liveValues = useMemo(() => [...liveRef.current.values()], [tick]);

  const removeLive = (connId, id) => {
    liveRef.current.delete(keyFor(connId, id));
    bump();
  };

  // Remember a watched OPC UA node's friendly name for its live records.
  const rememberLabel = (connId, node) => {
    labelsRef.current.set(keyFor(connId, node.nodeId), node.displayName);
  };

  // MQTT topic subscriptions live here so they survive view switches.
  const subscribeTopic = (connId, topic) => {
    if (!connId || !topic) return;
    const cur = mqttTopics[connId] || [];
    if (cur.includes(topic)) return;
    socket.emit('mqtt:subscribe', { connId, topic });
    setMqttTopics((prev) => ({ ...prev, [connId]: [...(prev[connId] || []), topic] }));
  };
  const unsubscribeTopic = (connId, topic) => {
    socket.emit('mqtt:unsubscribe', { connId, topic });
    setMqttTopics((prev) => ({ ...prev, [connId]: (prev[connId] || []).filter((t) => t !== topic) }));
  };

  const isUp = (connId) => connections.find((c) => c.id === connId)?.status === 'connected';
  const opcuaConns = connections.filter((c) => c.type === 'opcua');
  const mqttConns = connections.filter((c) => c.type === 'mqtt');

  const openBrowse = (c) => {
    setActiveOpcua(c.id);
    setView('explorer');
  };
  const openTopics = (c) => {
    setActiveMqtt(c.id);
    setView('explorer');
  };

  const showOpcua = activeOpcua && isUp(activeOpcua);
  const showMqtt = activeMqtt && isUp(activeMqtt);

  return (
    <div className="app">
      <CommandBar
        view={view}
        onView={setView}
        query={query}
        onQuery={setQuery}
        connected={connected}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="body">
        <aside className="rail">
          <ConnectionManager
            connections={connections}
            onBrowse={openBrowse}
            onOpenMqtt={openTopics}
            activeOpcua={activeOpcua}
            activeMqtt={activeMqtt}
          />
        </aside>

        <main className="canvas">
          {view === 'overview' && (
            <Overview
              values={liveValues}
              connections={connections}
              updatesPerSec={updatesPerSec}
              now={now}
              query={query}
              theme={theme}
              onRemove={removeLive}
            />
          )}

          {view === 'live' && (
            <LiveValues
              values={liveValues}
              onRemove={removeLive}
              query={query}
              connections={connections}
              now={now}
              theme={theme}
            />
          )}

          {view === 'explorer' && (
            <section className="view">
              <div className="view-title">
                <h2>Explorer</h2>
                <p>Browse the OPC UA address space and subscribe to MQTT topics</p>
              </div>
              {!showOpcua && !showMqtt ? (
                <div className="empty-hint">
                  <p>Connect a source, then use <strong>Browse</strong> (OPC UA) or <strong>Topics</strong> (MQTT) on a connection to explore it here.</p>
                  <p className="muted">
                    Tip: run <code>npm run demo-opcua</code> and add <code>opc.tcp://localhost:4840</code>.
                  </p>
                </div>
              ) : (
                <div className="explorer">
                  {showOpcua && (
                    <OpcuaBrowser
                      connId={activeOpcua}
                      connName={opcuaConns.find((c) => c.id === activeOpcua)?.name}
                      subscribedKeys={liveValues
                        .filter((v) => v.source === 'opcua')
                        .map((v) => keyFor(v.connId, v.id))}
                      onWatch={rememberLabel}
                    />
                  )}
                  {showMqtt && (
                    <MqttPanel
                      connName={mqttConns.find((c) => c.id === activeMqtt)?.name}
                      subscribed={mqttTopics[activeMqtt] || []}
                      onSubscribe={(t) => subscribeTopic(activeMqtt, t)}
                      onUnsubscribe={(t) => unsubscribeTopic(activeMqtt, t)}
                    />
                  )}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <div
        aria-live="polite"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
      >
        {srMessage}
      </div>
    </div>
  );
}
