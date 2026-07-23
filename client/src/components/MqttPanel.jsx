/**
 * MqttPanel — subscribe to MQTT topics (supports + / # wildcards). The list of
 * subscribed topics is owned by App (so it survives view switches); this
 * component just renders it and calls up to subscribe/unsubscribe.
 */
import React, { useState } from 'react';

export default function MqttPanel({ connName, subscribed, onSubscribe, onUnsubscribe }) {
  const [topic, setTopic] = useState('#');

  const subscribe = () => {
    const t = topic.trim();
    if (!t) return;
    onSubscribe(t);
  };

  return (
    <section className="panel mqtt-panel">
      <div className="panel-head">
        <span className="tag mqtt">MQTT</span>
        <h3>{connName} — topics</h3>
      </div>
      <div className="topic-input">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && subscribe()}
          placeholder="topic (supports + and # wildcards)"
          aria-label="Topic to subscribe"
        />
        <button className="btn small primary" onClick={subscribe}>Subscribe</button>
      </div>
      <ul className="topic-list">
        {subscribed.length === 0 && <li className="muted small">No topics subscribed.</li>}
        {subscribed.map((t) => (
          <li key={t} className="topic-chip">
            <code>{t}</code>
            <button className="x" onClick={() => onUnsubscribe(t)} title="Unsubscribe" aria-label="Unsubscribe">✕</button>
          </li>
        ))}
      </ul>
      <p className="muted small mqtt-hint">Incoming messages appear in Overview and Live Values.</p>
    </section>
  );
}
