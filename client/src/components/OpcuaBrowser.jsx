import React, { useEffect, useState } from 'react';
import { emit } from '../api/socket.js';

const keyFor = (connId, id) => `${connId}::${id}`;

export default function OpcuaBrowser({ connId, connName, subscribedKeys, onWatch, onUnwatch }) {
  const [roots, setRoots] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRoots(null);
    setError(null);
    emit('opcua:browse', { connId, nodeId: null }).then((res) => {
      if (res.ok) setRoots(res.nodes);
      else setError(res.error);
    });
  }, [connId]);

  const subscribed = new Set(subscribedKeys);

  const toggleSubscribe = (node, isSubscribed) => {
    if (isSubscribed) {
      onUnwatch?.(connId, node.nodeId);
    } else {
      onWatch?.(connId, node);
    }
  };

  return (
    <section className="panel opcua-browser">
      <div className="panel-head">
        <span className="tag opcua">OPC UA</span>
        <h3>{connName} — address space</h3>
      </div>
      {error && <div className="conn-error">{error}</div>}
      {!roots && !error && <div className="muted pad">Browsing…</div>}
      <ul className="tree">
        {roots?.map((n) => (
          <TreeNode
            key={n.nodeId}
            connId={connId}
            node={n}
            subscribed={subscribed}
            onToggle={toggleSubscribe}
          />
        ))}
      </ul>
    </section>
  );
}

function TreeNode({ connId, node, subscribed, onToggle }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState(null);
  const [loading, setLoading] = useState(false);
  const isSubscribed = subscribed.has(keyFor(connId, node.nodeId));

  // Inline write form (collapsed by default). Data type is auto-detected server-side.
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeValue, setWriteValue] = useState('');
  const [writeStatus, setWriteStatus] = useState(null); // { ok, error?, dataType? }

  const expand = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (children === null) {
      setLoading(true);
      const res = await emit('opcua:browse', { connId, nodeId: node.nodeId });
      setLoading(false);
      setChildren(res.ok ? res.nodes : []);
    }
  };

  const write = async () => {
    setWriteStatus(null);
    const res = await emit('opcua:write', { connId, nodeId: node.nodeId, value: writeValue });
    setWriteStatus(res);
    if (res?.ok) setTimeout(() => setWriteStatus(null), 2000);
  };

  return (
    <li className="tree-node">
      <div className="tree-row">
        <button className="twisty" onClick={expand} aria-label="expand">
          {open ? '▾' : '▸'}
        </button>
        <span className="node-name" onClick={expand}>
          {node.displayName}
        </span>
        {node.isVariable && (
          <>
            <label className="sub-check" title="Subscribe to this tag">
              <input
                type="checkbox"
                checked={isSubscribed}
                onChange={() => onToggle(node, isSubscribed)}
              />
              watch
            </label>
            <button
              className={`btn small write-toggle${writeOpen ? ' active' : ''}`}
              onClick={() => setWriteOpen((v) => !v)}
              title="Write a value to this tag"
            >
              write
            </button>
          </>
        )}
      </div>
      {node.isVariable && writeOpen && (
        <div className="write-row">
          <input
            value={writeValue}
            onChange={(e) => setWriteValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && write()}
            placeholder="value"
            aria-label="Value to write"
          />
          <button className="btn small primary" onClick={write}>Write</button>
          {writeStatus?.ok && (
            <span className="ok-note small">wrote {String(writeStatus.value)}</span>
          )}
          {writeStatus && !writeStatus.ok && (
            <span className="write-err small">{writeStatus.error}</span>
          )}
        </div>
      )}
      {open && (
        <ul className="tree">
          {loading && <li className="muted pad">Loading…</li>}
          {children?.length === 0 && !loading && <li className="muted pad">No children</li>}
          {children?.map((c) => (
            <TreeNode key={c.nodeId} connId={connId} node={c} subscribed={subscribed} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  );
}
