/**
 * MqttPanel — subscribe to MQTT topics (supports + / # wildcards) and publish
 * test messages. The list of subscribed topics is owned by App (so it survives
 * view switches); this component just renders it and calls up to
 * subscribe/unsubscribe/publish.
 */
import React, { useState } from 'react';

export default function MqttPanel({ connName, subscribed, onSubscribe, onUnsubscribe, onPublish }) {
  const [topic, setTopic] = useState('#');

  // Publish form state.
  const [pubTopic, setPubTopic] = useState('');
  const [pubPayload, setPubPayload] = useState('');
  const [retain, setRetain] = useState(false);
  const [pubStatus, setPubStatus] = useState(null); // { ok, error? }

  const subscribe = () => {
    const t = topic.trim();
    if (!t) return;
    onSubscribe(t);
  };

  const publish = async () => {
    const t = pubTopic.trim();
    if (!t) {
      setPubStatus({ ok: false, error: 'Topic is required' });
      return;
    }
    setPubStatus(null);
    const res = await onPublish(t, pubPayload, retain);
    setPubStatus(res);
    // Clear the transient "published" note after a moment.
    if (res?.ok) setTimeout(() => setPubStatus(null), 2000);
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

      <div className="publish-box">
        <div className="publish-head">Publish a test message</div>
        <div className="topic-input">
          <input
            value={pubTopic}
            onChange={(e) => setPubTopic(e.target.value)}
            placeholder="topic (no wildcards)"
            aria-label="Topic to publish to"
          />
        </div>
        <div className="topic-input">
          <input
            value={pubPayload}
            onChange={(e) => setPubPayload(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && publish()}
            placeholder="payload"
            aria-label="Message payload"
          />
          <button className="btn small primary" onClick={publish}>Publish</button>
        </div>
        <div className="publish-opts">
          <label className="check-label">
            <input type="checkbox" checked={retain} onChange={(e) => setRetain(e.target.checked)} />
            retain
          </label>
          {pubStatus?.ok && <span className="ok-note small">Published ✓</span>}
        </div>
        {pubStatus && !pubStatus.ok && <div className="conn-error">{pubStatus.error}</div>}
      </div>

      <p className="muted small mqtt-hint">
        Incoming messages appear in Overview and Live Values. A published message only
        shows there if its topic (or a matching wildcard) is subscribed above.
      </p>
    </section>
  );
}
