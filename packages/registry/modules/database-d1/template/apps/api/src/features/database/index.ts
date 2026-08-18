import { Hono } from 'hono';
import { createDb } from '../../db/index.js';

interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get('/health/db', async (c) => {
  const dbBinding = c.env.DB;
  if (!dbBinding) {
    return c.json({ status: 'error', bound: false }, 503);
  }
  return c.json({ status: 'ok', bound: true });
});

app.get('/posts', async (c) => {
  const db = createDb(c.env);
  const rows = await db.query.posts.findMany();
  return c.json({ posts: rows });
});

export default app;
