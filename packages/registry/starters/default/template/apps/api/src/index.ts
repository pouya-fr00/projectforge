import { Hono } from 'hono';
import { features } from './features/index.js';

const app = new Hono();

for (const feature of features) {
  // Each feature router may declare its own bindings; treat them uniformly when
  // mounting so the aggregator stays type-agnostic.
  app.route(feature.path, feature.router as Hono);
}

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/', (c) => c.text('Hello from __PROJECT_NAME__ API'));

export default app;
