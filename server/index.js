/**
 * IoTMonitor server entry point.
 *
 * Serves the built React client (client/dist) and hosts the Socket.IO endpoint
 * that streams OPC UA / MQTT data to the browser.
 */
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import { Server } from 'socket.io';
import { attachSockets } from './socket.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const CLIENT_DIST = join(__dirname, '..', 'client', 'dist');

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));

if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  // SPA fallback for client-side routing.
  app.get('*', (_req, res) => res.sendFile(join(CLIENT_DIST, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res
      .status(200)
      .send('IoTMonitor server is running. Build the client (npm run build) or use the Vite dev server.')
  );
}

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: true } });
const { shutdown } = attachSockets(io);

httpServer.listen(PORT, () => {
  console.log(`IoTMonitor server listening on http://localhost:${PORT}`);
});

async function gracefulExit() {
  console.log('\nShutting down…');
  await shutdown();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);
