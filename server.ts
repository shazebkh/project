import express from 'express';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './apps/api/src/routes/api';
import path from 'path';

const PORT = 3000;

async function startServer() {
  const app = express();

  // Parse JSON payloads up to 10MB (for camera photo uploads)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API endpoints under /api and root routes for full spec compliance
  app.use('/api', apiRouter);
  app.use(apiRouter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Check if production or dev
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist
    app.use(express.static(path.resolve(import.meta.dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(import.meta.dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CleanStreak fullstack server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start when executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start CleanStreak server:', err);
    process.exit(1);
  });
}

export { startServer };
