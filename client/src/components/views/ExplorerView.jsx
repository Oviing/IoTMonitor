import React from 'react';
import OpcuaBrowser from '../OpcuaBrowser.jsx';
import MqttPanel from '../MqttPanel.jsx';

/**
 * Explorer: OPC UA address-space browsing and MQTT topic subscription given room
 * to breathe side by side. Scoped to the connection(s) currently opened from the
 * rail. Reuses the existing OpcuaBrowser / MqttPanel components unchanged.
 *
 * @param {{
 *   activeOpcua:?string, activeMqtt:?string,
 *   opcuaConns:object[], mqttConns:object[],
 *   isUp:(connId:string)=>boolean,
 *   subscribedKeys:string[],
 *   onWatch:(connId:string,node:object)=>void,
 *   subscribedTopics:string[],
 *   onSubscribeTopic:(topic:string)=>void,
 *   onUnsubscribeTopic:(topic:string)=>void
 * }} props
 */
export default function ExplorerView({
  activeOpcua,
  activeMqtt,
  opcuaConns,
  mqttConns,
  isUp,
  subscribedKeys,
  onWatch,
  subscribedTopics,
  onSubscribeTopic,
  onUnsubscribeTopic,
}) {
  const showOpcua = activeOpcua && isUp(activeOpcua);
  const showMqtt = activeMqtt && isUp(activeMqtt);

  return (
    <section className="view">
      <div className="view-title">
        <h2>Explorer</h2>
        <p>Browse the OPC UA address space and subscribe to MQTT topics</p>
      </div>

      {!showOpcua && !showMqtt ? (
        <div className="empty-hint">
          <p>Open a connected connection from the rail to browse it here.</p>
          <p className="muted">
            Use <b>Browse</b> on a connected OPC UA connection, or <b>Topics</b> on an MQTT connection.
          </p>
        </div>
      ) : (
        <div className="explorer">
          {showOpcua && (
            <OpcuaBrowser
              connId={activeOpcua}
              connName={opcuaConns.find((c) => c.id === activeOpcua)?.name}
              subscribedKeys={subscribedKeys}
              onWatch={onWatch}
            />
          )}
          {showMqtt && (
            <MqttPanel
              connName={mqttConns.find((c) => c.id === activeMqtt)?.name}
              subscribed={subscribedTopics}
              onSubscribe={onSubscribeTopic}
              onUnsubscribe={onUnsubscribeTopic}
            />
          )}
        </div>
      )}
    </section>
  );
}
