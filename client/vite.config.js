import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During `npm run dev`, proxy the Socket.IO endpoint to the backend on :4000.
// In production the built files are served by the same Express server, so no proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
});
