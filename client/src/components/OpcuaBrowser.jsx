import React, { useEffect, useState } from 'react';
import { emit, socket } from '../api/socket.js';

const keyFor = (connId, id) => `${connId}::${id}`;

export default function OpcuaBrowser({ connId, connName, subscribedKeys }) {
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

  const toggleSubscribe = (nodeId, isSubscribed) => {
    if (isSubscribed) socket.emit('opcua:unsubscribe', { connId, nodeId });
    else socket.emit('opcua:subscribe', { connId, nodeIds: [nodeId] });
  };

  return (
    <section className="panel opcua-browser">
      <div className="panel-head">
        <h3>Browse — {connName}</h3>
        <span className="muted">OPC UA address space</span>
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
          <label className="sub-check" title="Subscribe to this tag">
            <input
              type="checkbox"
              checked={isSubscribed}
              onChange={() => onToggle(node.nodeId, isSubscribed)}
            />
            watch
          </label>
        )}
      </div>
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
