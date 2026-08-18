import { Hono } from 'hono';
import type { Context } from 'hono';
import { createAuth, type AuthEnv } from '../../lib/auth.js';

const app = new Hono<{ Bindings: AuthEnv }>();

function isAllowedOrigin(origin: string | undefined, trustedUrl: string | undefined): boolean {
  if (!origin || !trustedUrl) return false;
  try {
    if (new URL(origin).origin === new URL(trustedUrl).origin) return true;
    // When running locally, also allow the Vite dev server origin so the
    // Web app can proxy /api requests through the Vite dev server.
    const trustedHost = new URL(trustedUrl).hostname;
    if (trustedHost === 'localhost' || trustedHost === '127.0.0.1' || trustedHost === '[::1]' || trustedHost === '::1') {
      if (new URL(origin).origin === 'http://localhost:5173') return true;
    }
  } catch {
    // fall through to false
  }
  return false;
}

function forbidden(c: Context<{ Bindings: AuthEnv }>) {
  return c.json({ code: 'PF_AUTH_UNTRUSTED_ORIGIN', error: 'forbidden' }, 403);
}

// Trusted-origin / CORS/CSRF boundary for all auth routes. This is a real
// (non-mock) security layer that complements Better Auth's own protections and
// is deterministic across browsers, test clients, and server-side fetch calls.
app.use('*', async (c, next) => {
  const trustedUrl = c.env.BETTER_AUTH_URL;
  const origin = c.req.header('origin');
  const referer = c.req.header('referer');
  const allowedOrigin = origin ?? referer;
  const allowed = isAllowedOrigin(allowedOrigin, trustedUrl);

  // Handle CORS preflight explicitly.
  if (c.req.method === 'OPTIONS') {
    if (!allowed) {
      return forbidden(c);
    }
    const requestedHeaders = c.req.header('Access-Control-Request-Headers');
    c.header('Access-Control-Allow-Origin', allowedOrigin);
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    c.header(
      'Access-Control-Allow-Headers',
      requestedHeaders ?? 'Content-Type, Authorization'
    );
    c.header('Vary', 'Origin');
    return c.body(null, 204);
  }

  // State-changing requests must include an trusted Origin header. This
  // intentionally rejects same-origin clients that omit the header, because the
  // auth module is designed for browser/credentialed use where the header is
  // always present.
  const safeMethods = new Set(['GET', 'HEAD']);
  if (!safeMethods.has(c.req.method)) {
    if (!origin || !allowed) {
      return forbidden(c);
    }
  }

  // Reflect CORS headers for trusted origins on all safe and unsafe methods.
  if (origin && allowed) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Vary', 'Origin');
  }

  return next();
});

app.get('/me', async (c) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ user: null }, 401);
  }
  // Better Auth's session.user only carries standard fields.
  // Resolve the application role: try the user.role column first (always
  // available from the database-d1 migration), and if RBAC tables exist,
  // prefer the role from user_role → roles for consistency with the
  // Admin /users endpoint.
  let role = 'user';
  try {
    const roleRow = await c.env.DB.prepare(
      `SELECT COALESCE(r.name, u."role") AS role
       FROM "user" u
       LEFT JOIN user_role ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = ?`
    ).bind(session.user.id).first<{ role: string }>();
    role = roleRow?.role ?? 'user';
  } catch {
    // RBAC tables may not be installed yet — fall back to user.role.
    try {
      const roleRow = await c.env.DB.prepare(
        `SELECT "role" FROM "user" WHERE id = ?`
      ).bind(session.user.id).first<{ role: string }>();
      role = roleRow?.role ?? 'user';
    } catch {
      // If even the user table query fails, default to 'user'.
    }
  }

  const { id, name, email, emailVerified, image, createdAt, updatedAt } = session.user;
  return c.json({
    user: {
      id,
      name,
      email,
      emailVerified,
      image,
      createdAt,
      updatedAt,
      role,
    },
  });
});

app.all('/*', (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

export default app;
