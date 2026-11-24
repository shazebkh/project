import express from 'express';
import { apiRouter } from '../../../apps/api/src/routes/api';

export function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', apiRouter);
  app.use(apiRouter);
  return app;
}
