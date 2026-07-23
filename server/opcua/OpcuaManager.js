/**
 * OPC UA connection manager.
 *
 * Owns one OPCUAClient + session per connection id and provides browse / subscribe
 * operations on top of node-opcua. Value changes are tracked so we can tell when a
 * tag's value actually changed (drives the "changed" flash in the UI).
 *
 * Emits:
 *   'status' { connId, status, message? }   connection lifecycle
 *   'value'  { connId, nodeId, ... }         monitored-item value update
 */
import { EventEmitter } from 'node:events';
import {
  OPCUAClient,
  ClientSubscription,
  AttributeIds,
  TimestampsToReturn,
  MessageSecurityMode,
  SecurityPolicy,
  DataType,
  Variant,
} from 'node-opcua';

const ROOT_OBJECTS = 'ObjectsFolder';

export class OpcuaManager extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, {
     *   client: import('node-opcua').OPCUAClient,
     *   session: import('node-opcua').ClientSession,
     *   subscription?: import('node-opcua').ClientSubscription,
     *   monitored: Map<string, import('node-opcua').ClientMonitoredItem>,
     *   last: Map<string, string>,
     * }>} */
    this.connections = new Map();
  }

  isConnected(connId) {
    return this.connections.has(connId);
  }

  /**
   * Connect + create a session for a config.
   * @param {{ id: string, endpointUrl: string, securityPolicy?: string,
   *           securityMode?: string, username?: string, password?: string }} cfg
   */
  async connect(cfg) {
    if (this.connections.has(cfg.id)) return; // already connected

    const client = OPCUAClient.create({
      applicationName: 'IoTMonitor',
      endpointMustExist: false,
      securityMode: MessageSecurityMode[cfg.securityMode] ?? MessageSecurityMode.None,
      securityPolicy: SecurityPolicy[cfg.securityPolicy] ?? SecurityPolicy.None,
      connectionStrategy: { maxRetry: 1, initialDelay: 1000, maxDelay: 2000 },
    });

    client.on('backoff', (retry, delay) =>
      this.emit('status', {
        connId: cfg.id,
        status: 'connecting',
        message: `retry ${retry} in ${delay}ms`,
      })
    );
    client.on('connection_lost', () =>
      this.emit('status', { connId: cfg.id, status: 'disconnected', message: 'connection lost' })
    );

    await client.connect(cfg.endpointUrl);

    const userIdentity =
      cfg.username && cfg.username.length > 0
        ? { userName: cfg.username, password: cfg.password ?? '' }
        : null;
    const session = await client.createSession(userIdentity ?? undefined);

    this.connections.set(cfg.id, {
      client,
      session,
      subscription: undefined,
      monitored: new Map(),
      last: new Map(),
    });
    this.emit('status', { connId: cfg.id, status: 'connected' });
  }

  async disconnect(connId) {
    const conn = this.connections.get(connId);
    if (!conn) return;
    try {
      if (conn.subscription) await conn.subscription.terminate();
      await conn.session.close();
      await conn.client.disconnect();
    } catch (err) {
      // best-effort teardown
    } finally {
      this.connections.delete(connId);
      this.emit('status', { connId, status: 'disconnected' });
    }
  }

  /**
   * Browse the children of a node (address-space tree).
   * @param {string} connId
   * @param {string} [nodeId] defaults to the Objects folder
   * @returns {Promise<Array<{ nodeId: string, browseName: string, displayName: string,
   *   nodeClass: string, isVariable: boolean }>>}
   */
  async browse(connId, nodeId = ROOT_OBJECTS) {
    const conn = this.connections.get(connId);
    if (!conn) throw new Error('not connected');

    const result = await conn.session.browse(nodeId);
    const refs = result.references ?? [];
    return refs.map((r) => ({
      nodeId: r.nodeId.toString(),
      browseName: r.browseName.toString(),
      displayName: r.displayName?.text ?? r.browseName.toString(),
      nodeClass: r.nodeClass?.toString?.() ?? String(r.nodeClass),
      // nodeClass 2 === Variable in the OPC UA spec
      isVariable: r.nodeClass === 2 || r.nodeClass?.toString?.() === 'Variable',
    }));
  }

  /** Lazily create the shared ClientSubscription for a connection. */
  #ensureSubscription(conn, connId) {
    if (conn.subscription) return conn.subscription;
    const subscription = ClientSubscription.create(conn.session, {
      requestedPublishingInterval: 500,
      requestedMaxKeepAliveCount: 10,
      requestedLifetimeCount: 100,
      maxNotificationsPerPublish: 100,
      publishingEnabled: true,
      priority: 10,
    });
    conn.subscription = subscription;
    return subscription;
  }

  /**
   * Subscribe (monitor) one or more node values.
   * @param {string} connId
   * @param {string[]} nodeIds
   */
  async subscribe(connId, nodeIds) {
    const conn = this.connections.get(connId);
    if (!conn) throw new Error('not connected');
    const subscription = this.#ensureSubscription(conn, connId);

    for (const nodeId of nodeIds) {
      if (conn.monitored.has(nodeId)) continue;
      const item = await subscription.monitor(
        { nodeId, attributeId: AttributeIds.Value },
        { samplingInterval: 250, discardOldest: true, queueSize: 10 },
        TimestampsToReturn.Both
      );
      conn.monitored.set(nodeId, item);

      item.on('changed', (dataValue) => {
        const value = coerceValue(dataValue.value?.value);
        const dataType = dataValue.value?.dataType?.toString?.() ?? 'unknown';
        const sourceTs = dataValue.sourceTimestamp?.getTime?.() ?? Date.now();
        const serialized = JSON.stringify(value);
        const changed = conn.last.get(nodeId) !== serialized;
        conn.last.set(nodeId, serialized);
        this.emit('value', {
          connId,
          nodeId,
          value,
          dataType,
          quality: dataValue.statusCode?.name ?? 'Good',
          sourceTs,
          changed,
        });
      });
    }
  }

  /** Stop monitoring a node. */
  async unsubscribe(connId, nodeId) {
    const conn = this.connections.get(connId);
    if (!conn) return;
    const item = conn.monitored.get(nodeId);
    if (item) {
      try {
        await item.terminate();
      } catch {
        /* ignore */
      }
      conn.monitored.delete(nodeId);
      conn.last.delete(nodeId);
    }
  }

  /**
   * Write a value to a node (for testing the monitor from the UI). The data type
   * is auto-detected by reading the node's current Value, so the caller only
   * supplies a raw (typically string) value which is coerced to match.
   * @param {string} connId
   * @param {string} nodeId
   * @param {unknown} rawValue
   * @returns {Promise<{ dataType: string, value: unknown }>}
   */
  async write(connId, nodeId, rawValue) {
    const conn = this.connections.get(connId);
    if (!conn) throw new Error('not connected');

    // Auto-detect: read the current Value to learn its Variant dataType.
    const current = await conn.session.read({ nodeId, attributeId: AttributeIds.Value });
    const dataType = current.value?.dataType;
    if (dataType == null) throw new Error('could not determine data type for node');

    const value = coerceInput(rawValue, dataType);
    const statusCode = await conn.session.write({
      nodeId,
      attributeId: AttributeIds.Value,
      value: { value: new Variant({ dataType, value }) },
    });
    if (typeof statusCode?.isGood === 'function' && !statusCode.isGood()) {
      throw new Error(statusCode.name || 'write failed');
    }
    return { dataType: DataType[dataType] ?? String(dataType), value };
  }

  /** Tear down every connection (process shutdown). */
  async shutdown() {
    await Promise.allSettled([...this.connections.keys()].map((id) => this.disconnect(id)));
  }
}

/** Make node-opcua values JSON-safe (BigInt, typed arrays, etc.). */
function coerceValue(value) {
  if (typeof value === 'bigint') return value.toString();
  if (ArrayBuffer.isView(value)) return Array.from(value);
  return value;
}

/** DataType enum values that represent integers (see node-opcua DataType). */
const INTEGER_TYPES = new Set([
  DataType.SByte,
  DataType.Byte,
  DataType.Int16,
  DataType.UInt16,
  DataType.Int32,
  DataType.UInt32,
  DataType.Int64,
  DataType.UInt64,
]);
const FLOAT_TYPES = new Set([DataType.Float, DataType.Double]);

/**
 * Coerce a raw (usually string) input into the JS type expected for a given
 * OPC UA DataType. Throws on values that can't be represented numerically so the
 * failure is reported back through the socket ack.
 * @param {unknown} raw
 * @param {number} dataType a node-opcua DataType enum value
 */
function coerceInput(raw, dataType) {
  if (dataType === DataType.Boolean) {
    if (typeof raw === 'boolean') return raw;
    return /^(true|1)$/i.test(String(raw).trim());
  }
  if (INTEGER_TYPES.has(dataType)) {
    const n = Number.parseInt(String(raw).trim(), 10);
    if (Number.isNaN(n)) throw new Error(`"${raw}" is not a valid integer`);
    return n;
  }
  if (FLOAT_TYPES.has(dataType)) {
    const n = Number.parseFloat(String(raw));
    if (Number.isNaN(n)) throw new Error(`"${raw}" is not a valid number`);
    return n;
  }
  return String(raw);
}
