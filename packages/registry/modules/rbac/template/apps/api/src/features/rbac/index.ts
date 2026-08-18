import { Hono } from 'hono';
import { requirePermission } from './middleware.js';

const app = new Hono();

app.get('/health', requirePermission('admin'), (c) => {
  return c.json({ ok: true });
});

app.get('/users', requirePermission('admin'), async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u."role", r.name AS "rbacRole"
     FROM "user" u
     LEFT JOIN user_role ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     ORDER BY u."createdAt" DESC`
  ).all<{ id: string; name: string; email: string; role: string; rbacRole: string | null }>();

  const users = (result.results ?? []).map(({ id, name, email, role, rbacRole }) => ({
    id,
    name,
    email,
    role: rbacRole ?? role ?? 'user',
  }));

  return c.json({ users });
});

export default app;
