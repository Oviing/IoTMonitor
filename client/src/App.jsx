import React, { useEffect, useMemo, useRef, useState } from 'react';
import { socket } from './api/socket.js';
import ConnectionManager from './components/ConnectionManager.jsx';
import OpcuaBrowser from './components/OpcuaBrowser.jsx';
import MqttPanel from './components/MqttPanel.jsx';
import LiveValues from './components/LiveValues.jsx';

const HISTORY_CAP = 60;
const keyFor = (connId, id) => `${connId}::${id}`;

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [connections, setConnections] = useState([]);
  // liveValues: Map key -> value record. Kept in a ref for high-frequency updates,
  // mirrored into state via a version counter to trigger re-renders.
  const liveRef = useRef(new Map());
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => (t + 1) % 1_000_000);
  const [activeOpcua, setActiveOpcua] = useState(null); // connId currently browsing
  const [activeMqtt, setActiveMqtt] = useState(null);

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

  const liveValues = useMemo(() => [...liveRef.current.values()], [liveRef.current.size, setTick]);

  const removeLive = (connId, id) => {
    liveRef.current.delete(keyFor(connId, id));
    bump();
  };

  const opcuaConns = connections.filter((c) => c.type === 'opcua');
  const mqttConns = connections.filter((c) => c.type === 'mqtt');
  const isUp = (connId) => connections.find((c) => c.id === connId)?.status === 'connected';

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="logo">◆</span> IoTMonitor
        </h1>
        <span className={`ws-status ${connected ? 'up' : 'down'}`}>
          {connected ? 'server connected' : 'server offline'}
        </span>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <ConnectionManager
            connections={connections}
            onBrowse={(c) => setActiveOpcua(c.id)}
            onOpenMqtt={(c) => setActiveMqtt(c.id)}
            activeOpcua={activeOpcua}
            activeMqtt={activeMqtt}
          />
        </aside>

        <main className="main">
          <div className="panels">
            {activeOpcua && isUp(activeOpcua) && (
              <OpcuaBrowser
                connId={activeOpcua}
                connName={opcuaConns.find((c) => c.id === activeOpcua)?.name}
                subscribedKeys={liveValues.filter((v) => v.source === 'opcua').map((v) => keyFor(v.connId, v.id))}
              />
            )}
            {activeMqtt && isUp(activeMqtt) && (
              <MqttPanel
                connId={activeMqtt}
                connName={mqttConns.find((c) => c.id === activeMqtt)?.name}
              />
            )}
            {!activeOpcua && !activeMqtt && (
              <div className="empty-hint">
                <p>Add a connection, connect it, then open its browser to subscribe to tags or topics.</p>
                <p className="muted">
                  Tip: run <code>npm run demo-opcua</code> and add <code>opc.tcp://localhost:4840</code> to try it out.
                </p>
              </div>
            )}
          </div>

          <LiveValues values={liveValues} onRemove={removeLive} />
        </main>
      </div>
    </div>
  );
}
