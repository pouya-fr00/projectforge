import type { Context } from 'hono';
import { Hono } from 'hono';
import { createAuth, type AuthEnv } from '../../lib/auth.js';

interface Env extends AuthEnv {
  DB: D1Database;
}

interface CommentRow {
  id: string;
  body: string;
  userId: string;
  postId: string;
  createdAt: number;
  updatedAt: number;
}

const app = new Hono<{ Bindings: Env }>();

const MAX_BODY_LENGTH = 5000;

async function getSessionUser(c: Context<{ Bindings: Env }>) {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return session?.user ?? null;
}

function validateBody(body: unknown): { ok: false; error: string } | { ok: true; body: string } {
  if (typeof body !== 'string') {
    return { ok: false, error: 'body must be a string' };
  }
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'body cannot be empty' };
  }
  if (trimmed.length > MAX_BODY_LENGTH) {
    return { ok: false, error: `body must be at most ${MAX_BODY_LENGTH} characters` };
  }
  return { ok: true, body: trimmed };
}

app.get('/', async (c) => {
  const db = c.env.DB;
  const { results } = await db
    .prepare(
      `SELECT id, body, userId, postId, createdAt, updatedAt
       FROM comments
       ORDER BY createdAt DESC
       LIMIT 100`
    )
    .all<CommentRow>();
  return c.json({ comments: results ?? [] });
});

app.post('/', async (c) => {
  const user = await getSessionUser(c);
  if (!user) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const bodyPayload = await c.req.json().catch(() => ({}));
  const validation = validateBody(bodyPayload.body);
  if (!validation.ok) {
    return c.json({ error: validation.error }, 400);
  }

  const postId = typeof bodyPayload.postId === 'string' ? bodyPayload.postId.trim() : '';
  if (!postId) {
    return c.json({ error: 'postId is required' }, 400);
  }

  const db = c.env.DB;
  const id = crypto.randomUUID();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO comments (id, body, userId, postId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, validation.body, user.id, postId, now, now)
    .run();

  return c.json({ comment: { id, body: validation.body, userId: user.id, postId, createdAt: now, updatedAt: now } }, 201);
});

app.patch('/:id', async (c) => {
  const user = await getSessionUser(c);
  if (!user) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const id = c.req.param('id');
  const bodyPayload = await c.req.json().catch(() => ({}));
  const validation = validateBody(bodyPayload.body);
  if (!validation.ok) {
    return c.json({ error: validation.error }, 400);
  }

  const db = c.env.DB;

  // Verify ownership before updating.
  const existing = await db
    .prepare('SELECT userId FROM comments WHERE id = ?')
    .bind(id)
    .first<{ userId: string }>();

  if (!existing) {
    return c.json({ error: 'not found' }, 404);
  }

  if (existing.userId !== user.id) {
    return c.json({ error: 'forbidden' }, 403);
  }

  const now = Date.now();
  await db
    .prepare('UPDATE comments SET body = ?, updatedAt = ? WHERE id = ?')
    .bind(validation.body, now, id)
    .run();

  return c.json({ ok: true });
});

app.delete('/:id', async (c) => {
  const user = await getSessionUser(c);
  if (!user) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const id = c.req.param('id');
  const db = c.env.DB;

  const existing = await db
    .prepare('SELECT userId FROM comments WHERE id = ?')
    .bind(id)
    .first<{ userId: string }>();

  if (!existing) {
    return c.json({ error: 'not found' }, 404);
  }

  if (existing.userId !== user.id) {
    return c.json({ error: 'forbidden' }, 403);
  }

  await db.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

export default app;
