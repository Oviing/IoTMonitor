import { io } from 'socket.io-client';

// Same-origin: dev uses the Vite proxy, production is served by Express.
export const socket = io({ autoConnect: true });

/** Promise wrapper around a socket event that expects an ack callback. */
export function emit(event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, (res) => resolve(res ?? { ok: true }));
  });
}
