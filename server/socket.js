/**
 * Socket.IO wiring: maps client events to the OPC UA / MQTT managers and streams
 * status, browse results, and live values back to every connected browser.
 *
 * A connection config looks like:
 *   { id, name, type: 'opcua'|'mqtt', ...typeSpecificFields }
 * OPC UA: endpointUrl, securityPolicy, securityMode, username, password
 * MQTT:   brokerUrl, clientId, username, password
 */
import { nanoid } from 'nanoid';
import { loadConnections, saveConnections } from './config.js';
import { HistoryBuffer } from './history/HistoryBuffer.js';
import { OpcuaManager } from './opcua/OpcuaManager.js';
import { MqttManager } from './mqtt/MqttManager.js';

/** Composite key for a monitored value in the history buffer. */
const keyFor = (connId, id) => `${connId}::${id}`;

export function attachSockets(io) {
  const opcua = new OpcuaManager();
  const mqtt = new MqttManager();
  const history = new HistoryBuffer(100);

  /** Persisted connection definitions (source of truth for config). */
  let connections = [];
  loadConnections().then((c) => {
    connections = c;
  });

  const statusById = new Map(); // connId -> last known status string

  // --- Manager → all clients ---------------------------------------------
  opcua.on('status', ({ connId, status, message }) => {
    statusById.set(connId, status);
    io.emit('connection:status', { connId, status, message });
  });
  opcua.on('value', (payload) => {
    history.push(keyFor(payload.connId, payload.nodeId), payload.value, payload.sourceTs);
    io.emit('opcua:value', payload);
  });

  mqtt.on('status', ({ connId, status, message }) => {
    statusById.set(connId, status);
    io.emit('connection:status', { connId, status, message });
  });
  mqtt.on('message', (payload) => {
    history.push(keyFor(payload.connId, payload.topic), payload.payload, payload.ts);
    io.emit('mqtt:message', payload);
  });

  const currentStatus = (connId) => {
    if (opcua.isConnected(connId) || mqtt.isConnected(connId)) {
      return statusById.get(connId) ?? 'connected';
    }
    return 'disconnected';
  };

  const withStatus = () =>
    connections.map((c) => ({ ...c, status: currentStatus(c.id) }));

  // --- Per-socket handlers -----------------------------------------------
  io.on('connection', (socket) => {
    socket.emit('connections', withStatus());

    socket.on('connection:list', () => socket.emit('connections', withStatus()));

    socket.on('connection:save', async (cfg, ack) => {
      let saved;
      if (cfg.id && connections.some((c) => c.id === cfg.id)) {
        connections = connections.map((c) => (c.id === cfg.id ? { ...c, ...cfg } : c));
        saved = connections.find((c) => c.id === cfg.id);
      } else {
        saved = { ...cfg, id: nanoid(10) };
        connections.push(saved);
      }
      await saveConnections(connections);
      io.emit('connections', withStatus());
      ack?.({ ok: true, connection: saved });
    });

    socket.on('connection:delete', async (connId, ack) => {
      await safeDisconnect(connId);
      connections = connections.filter((c) => c.id !== connId);
      await saveConnections(connections);
      io.emit('connections', withStatus());
      ack?.({ ok: true });
    });

    socket.on('connection:connect', async (connId, ack) => {
      const cfg = connections.find((c) => c.id === connId);
      if (!cfg) return ack?.({ ok: false, error: 'unknown connection' });
      try {
        if (cfg.type === 'opcua') await opcua.connect(cfg);
        else await mqtt.connect(cfg);
        ack?.({ ok: true });
      } catch (err) {
        io.emit('connection:status', { connId, status: 'error', message: err.message });
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('connection:disconnect', async (connId, ack) => {
      await safeDisconnect(connId);
      ack?.({ ok: true });
    });

    // --- OPC UA ----------------------------------------------------------
    socket.on('opcua:browse', async ({ connId, nodeId }, ack) => {
      try {
        const nodes = await opcua.browse(connId, nodeId || undefined);
        ack?.({ ok: true, nodeId: nodeId || 'ObjectsFolder', nodes });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('opcua:subscribe', async ({ connId, nodeIds }, ack) => {
      try {
        await opcua.subscribe(connId, Array.isArray(nodeIds) ? nodeIds : [nodeIds]);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('opcua:unsubscribe', async ({ connId, nodeId }, ack) => {
      await opcua.unsubscribe(connId, nodeId);
      history.clear(keyFor(connId, nodeId));
      ack?.({ ok: true });
    });

    // --- MQTT ------------------------------------------------------------
    socket.on('mqtt:subscribe', ({ connId, topic }, ack) => {
      try {
        mqtt.subscribe(connId, topic);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('mqtt:unsubscribe', ({ connId, topic }, ack) => {
      mqtt.unsubscribe(connId, topic);
      history.clear(keyFor(connId, topic));
      ack?.({ ok: true });
    });

    // --- History ---------------------------------------------------------
    socket.on('history:get', ({ connId, key }, ack) => {
      ack?.({ ok: true, samples: history.get(keyFor(connId, key)) });
    });
  });

  async function safeDisconnect(connId) {
    await opcua.disconnect(connId);
    await mqtt.disconnect(connId);
  }

  return {
    async shutdown() {
      await opcua.shutdown();
      await mqtt.shutdown();
    },
  };
}
