import React, { useState } from 'react';
import { emit, socket } from '../api/socket.js';

const EMPTY_OPCUA = {
  type: 'opcua',
  name: '',
  endpointUrl: 'opc.tcp://localhost:4840',
  securityPolicy: 'None',
  securityMode: 'None',
  username: '',
  password: '',
};
const EMPTY_MQTT = {
  type: 'mqtt',
  name: '',
  brokerUrl: 'mqtt://test.mosquitto.org:1883',
  clientId: '',
  username: '',
  password: '',
};

export default function ConnectionManager({
  connections,
  liveValues = [],
  onBrowse,
  onOpenMqtt,
  activeOpcua,
  activeMqtt,
}) {
  const [draft, setDraft] = useState(null); // config being edited/created
  const watchedCount = (connId) => liveValues.filter((v) => v.connId === connId).length;

  const startNew = (type) => setDraft(type === 'opcua' ? { ...EMPTY_OPCUA } : { ...EMPTY_MQTT });
  const cancel = () => setDraft(null);

  const save = async () => {
    if (!draft.name?.trim()) return;
    await emit('connection:save', draft);
    setDraft(null);
  };

  const connect = (id) => socket.emit('connection:connect', id);
  const disconnect = (id) => socket.emit('connection:disconnect', id);
  const remove = (id) => {
    if (confirm('Delete this connection?')) socket.emit('connection:delete', id);
  };

  return (
    <section className="conn-manager">
      <div className="section-head">
        <span className="micro">Connections</span>
        <div className="add-buttons">
          <button className="btn small" onClick={() => startNew('opcua')}>
            + OPC UA
          </button>
          <button className="btn small" onClick={() => startNew('mqtt')}>
            + MQTT
          </button>
        </div>
      </div>

      {draft && (
        <ConnectionForm draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} />
      )}

      <ul className="conn-list">
        {connections.length === 0 && !draft && <li className="muted small">No connections yet.</li>}
        {connections.map((c) => {
          const up = c.status === 'connected';
          const active = c.id === activeOpcua || c.id === activeMqtt;
          const dotClass = up ? 'up' : c.status === 'error' ? 'warn' : 'down';
          return (
            <li key={c.id} className={`conn ${active ? 'active' : ''}`}>
              <div className="conn-top">
                <span className={`dot ${dotClass}`} title={c.statusMessage || c.status} />
                <span className="conn-name">{c.name}</span>
                <span className={`tag ${c.type}`}>{c.type === 'opcua' ? 'OPC UA' : 'MQTT'}</span>
                <button className="btn edit" onClick={() => setDraft(c)} title="Edit">
                  ✎
                </button>
                <button className="btn edit danger" onClick={() => remove(c.id)} title="Delete">
                  ✕
                </button>
              </div>
              <div className="conn-ep mono">{c.endpointUrl || c.brokerUrl}</div>
              <div className="conn-stats">
                <span>
                  <b>{watchedCount(c.id)}</b> watched
                </span>
                <span className="muted">{up ? 'connected' : c.status || 'disconnected'}</span>
              </div>
              <div className="conn-actions">
                {up ? (
                  <button className="btn small warn" onClick={() => disconnect(c.id)}>
                    Disconnect
                  </button>
                ) : (
                  <button className="btn small" onClick={() => connect(c.id)}>
                    Connect
                  </button>
                )}
                {up && c.type === 'opcua' && (
                  <button className="btn small primary" onClick={() => onBrowse(c)}>
                    Browse
                  </button>
                )}
                {up && c.type === 'mqtt' && (
                  <button className="btn small primary" onClick={() => onOpenMqtt(c)}>
                    Topics
                  </button>
                )}
              </div>
              {c.statusMessage && c.status === 'error' && (
                <div className="conn-error">{c.statusMessage}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ConnectionForm({ draft, setDraft, onSave, onCancel }) {
  const set = (k, v) => setDraft({ ...draft, [k]: v });
  const isOpcua = draft.type === 'opcua';

  return (
    <div className="conn-form">
      <div className="form-title">{draft.id ? 'Edit' : 'New'} {draft.type.toUpperCase()} connection</div>
      <label>
        Name
        <input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="My PLC" />
      </label>

      {isOpcua ? (
        <>
          <label>
            Endpoint URL
            <input value={draft.endpointUrl} onChange={(e) => set('endpointUrl', e.target.value)} />
          </label>
          <div className="form-row">
            <label>
              Security policy
              <select value={draft.securityPolicy} onChange={(e) => set('securityPolicy', e.target.value)}>
                <option>None</option>
                <option>Basic256Sha256</option>
                <option>Aes128_Sha256_RsaOaep</option>
              </select>
            </label>
            <label>
              Security mode
              <select value={draft.securityMode} onChange={(e) => set('securityMode', e.target.value)}>
                <option>None</option>
                <option>Sign</option>
                <option>SignAndEncrypt</option>
              </select>
            </label>
          </div>
        </>
      ) : (
        <>
          <label>
            Broker URL
            <input value={draft.brokerUrl} onChange={(e) => set('brokerUrl', e.target.value)} placeholder="mqtt://host:1883" />
          </label>
          <label>
            Client ID (optional)
            <input value={draft.clientId} onChange={(e) => set('clientId', e.target.value)} />
          </label>
        </>
      )}

      <div className="form-row">
        <label>
          Username (optional)
          <input value={draft.username} onChange={(e) => set('username', e.target.value)} />
        </label>
        <label>
          Password (optional)
          <input type="password" value={draft.password} onChange={(e) => set('password', e.target.value)} />
        </label>
      </div>

      <div className="form-actions">
        <button className="btn small primary" onClick={onSave}>
          Save
        </button>
        <button className="btn small" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
