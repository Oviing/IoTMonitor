import React, { useState } from 'react';
import { socket } from '../api/socket.js';

export default function MqttPanel({ connId, connName }) {
  const [topic, setTopic] = useState('#');
  const [subscribed, setSubscribed] = useState([]);

  const subscribe = () => {
    const t = topic.trim();
    if (!t || subscribed.includes(t)) return;
    socket.emit('mqtt:subscribe', { connId, topic: t });
    setSubscribed((prev) => [...prev, t]);
  };

  const unsubscribe = (t) => {
    socket.emit('mqtt:unsubscribe', { connId, topic: t });
    setSubscribed((prev) => prev.filter((x) => x !== t));
  };

  return (
    <section className="panel mqtt-panel">
      <div className="panel-head">
        <h3>Topics — {connName}</h3>
        <span className="muted">MQTT subscriptions</span>
      </div>
      <div className="topic-input">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && subscribe()}
          placeholder="topic (supports + and # wildcards)"
        />
        <button className="btn small primary" onClick={subscribe}>
          Subscribe
        </button>
      </div>
      <ul className="topic-list">
        {subscribed.length === 0 && <li className="muted">No topics subscribed.</li>}
        {subscribed.map((t) => (
          <li key={t} className="topic-chip">
            <code>{t}</code>
            <button className="btn edit danger" onClick={() => unsubscribe(t)} title="Unsubscribe">
              ✕
            </button>
          </li>
        ))}
      </ul>
      <p className="muted small">Incoming messages appear in the Live Values table below.</p>
    </section>
  );
}
