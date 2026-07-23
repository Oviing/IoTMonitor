/**
 * MQTT connection manager.
 *
 * Owns one mqtt client per connection id and supports subscribing to topics
 * (including wildcards, + and #). Incoming messages are emitted for the live view.
 *
 * Emits:
 *   'status'  { connId, status, message? }
 *   'message' { connId, topic, payload, ts, changed }
 */
import { EventEmitter } from 'node:events';
import mqtt from 'mqtt';

export class MqttManager extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, {
     *   client: import('mqtt').MqttClient,
     *   topics: Set<string>,
     *   last: Map<string, string>,
     * }>} */
    this.connections = new Map();
  }

  isConnected(connId) {
    return this.connections.has(connId);
  }

  /**
   * @param {{ id: string, brokerUrl: string, clientId?: string,
   *           username?: string, password?: string }} cfg
   */
  async connect(cfg) {
    if (this.connections.has(cfg.id)) return;

    const client = mqtt.connect(cfg.brokerUrl, {
      clientId: cfg.clientId || `iotmonitor_${Math.random().toString(16).slice(2, 10)}`,
      username: cfg.username || undefined,
      password: cfg.password || undefined,
      reconnectPeriod: 3000,
      connectTimeout: 10_000,
    });

    const entry = { client, topics: new Set(), last: new Map() };
    this.connections.set(cfg.id, entry);

    client.on('connect', () => {
      this.emit('status', { connId: cfg.id, status: 'connected' });
      // Re-subscribe after a reconnect.
      for (const topic of entry.topics) client.subscribe(topic);
    });
    client.on('reconnect', () =>
      this.emit('status', { connId: cfg.id, status: 'connecting', message: 'reconnecting' })
    );
    client.on('offline', () =>
      this.emit('status', { connId: cfg.id, status: 'disconnected', message: 'offline' })
    );
    client.on('error', (err) =>
      this.emit('status', { connId: cfg.id, status: 'error', message: err.message })
    );
    client.on('message', (topic, payload) => {
      const text = payload.toString('utf8');
      const changed = entry.last.get(topic) !== text;
      entry.last.set(topic, text);
      this.emit('message', { connId: cfg.id, topic, payload: text, ts: Date.now(), changed });
    });

    // Resolve once connected (or on first error) so callers get accurate status.
    await new Promise((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (err) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        client.off('connect', onConnect);
        client.off('error', onError);
      };
      client.once('connect', onConnect);
      client.once('error', onError);
    });
  }

  async disconnect(connId) {
    const entry = this.connections.get(connId);
    if (!entry) return;
    await new Promise((resolve) => entry.client.end(true, {}, resolve));
    this.connections.delete(connId);
    this.emit('status', { connId, status: 'disconnected' });
  }

  /** @param {string} connId @param {string} topic supports + and # wildcards */
  subscribe(connId, topic) {
    const entry = this.connections.get(connId);
    if (!entry) throw new Error('not connected');
    if (entry.topics.has(topic)) return;
    entry.topics.add(topic);
    entry.client.subscribe(topic, (err) => {
      if (err) this.emit('status', { connId, status: 'error', message: err.message });
    });
  }

  unsubscribe(connId, topic) {
    const entry = this.connections.get(connId);
    if (!entry) return;
    entry.topics.delete(topic);
    entry.last.delete(topic);
    entry.client.unsubscribe(topic);
  }

  /**
   * Publish a message to a topic (for testing the monitor from the UI). The app
   * does not auto-subscribe to what it publishes, so the message only shows up
   * in the live view if the topic (or a matching wildcard) is already subscribed.
   * @param {string} connId
   * @param {string} topic
   * @param {string} payload
   * @param {{ retain?: boolean, qos?: 0|1|2 }} [opts]
   */
  publish(connId, topic, payload, opts = {}) {
    const entry = this.connections.get(connId);
    if (!entry) throw new Error('not connected');
    entry.client.publish(topic, String(payload ?? ''), {
      qos: opts.qos ?? 0,
      retain: !!opts.retain,
    });
  }

  async shutdown() {
    await Promise.allSettled([...this.connections.keys()].map((id) => this.disconnect(id)));
  }
}
