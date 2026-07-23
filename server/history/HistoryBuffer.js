/**
 * In-memory per-key ring buffer for recent values.
 *
 * Keeps the last N samples ({ value, ts }) for each key (an OPC UA nodeId or an
 * MQTT topic). Used to drive the sparkline / recent-history view. No persistence
 * — everything is lost on restart, which is intentional for the MVP.
 */
export class HistoryBuffer {
  /** @param {number} capacity max samples kept per key */
  constructor(capacity = 100) {
    this.capacity = capacity;
    /** @type {Map<string, Array<{ value: any, ts: number }>>} */
    this.buffers = new Map();
  }

  /**
   * Append a sample for a key.
   * @param {string} key
   * @param {any} value
   * @param {number} [ts] epoch ms (defaults to now)
   * @returns {{ value: any, ts: number }} the stored sample
   */
  push(key, value, ts = Date.now()) {
    let buf = this.buffers.get(key);
    if (!buf) {
      buf = [];
      this.buffers.set(key, buf);
    }
    const sample = { value, ts };
    buf.push(sample);
    if (buf.length > this.capacity) buf.shift();
    return sample;
  }

  /**
   * Get the recent samples for a key (oldest → newest).
   * @param {string} key
   * @returns {Array<{ value: any, ts: number }>}
   */
  get(key) {
    return this.buffers.get(key) ?? [];
  }

  /** Drop the buffer for a key (e.g. on unsubscribe). */
  clear(key) {
    this.buffers.delete(key);
  }
}
