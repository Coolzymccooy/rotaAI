import express from 'express';
import http from 'http';
import net from 'net';
import path from 'path';
import app from './app.js';
import { logger } from './config/logger.js';
import { initSocket } from './config/socket.js';

const PREFERRED_PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_PORT_ATTEMPTS = 20;

function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(startPort: number, host: string): Promise<number> {
  for (let port = startPort; port < startPort + MAX_PORT_ATTEMPTS; port++) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
    logger.warn(`Port ${port} is in use, trying ${port + 1}...`);
  }
  throw new Error(`No available port found between ${startPort} and ${startPort + MAX_PORT_ATTEMPTS - 1}`);
}

async function startServer() {
  const HOST = '0.0.0.0';

  // Find an available port
  const PORT = await findAvailablePort(PREFERRED_PORT, HOST);
  if (PORT !== PREFERRED_PORT) {
    logger.warn(`Port ${PREFERRED_PORT} was unavailable. Using port ${PORT} instead.`);
  }

  // Create HTTP server
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  initSocket(httpServer);

  // Vite middleware for development (dynamic import to avoid crash in prod)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      logger.warn('Vite not available, serving static files');
    }
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, HOST, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Socket.IO enabled`);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});
