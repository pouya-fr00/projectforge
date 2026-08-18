import { createMiddleware } from 'hono/factory';
import { createAuth, type AuthEnv } from '../../lib/auth.js';

export type Permission = 'users:read' | 'users:write' | 'admin';

export type Role = 'admin' | 'user';

export interface RbacEnv extends AuthEnv {
  DB: D1Database;
}

export async function getUserPermissions(db: D1Database, userId: string): Promise<Permission[]> {
  const statement = db.prepare(
    `SELECT DISTINCT p.name AS name
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN roles r ON r.id = rp.role_id
     JOIN user_role ur ON ur.role_id = r.id
     WHERE ur.user_id = ?
     UNION
     SELECT DISTINCT p.name AS name
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN roles r ON r.id = rp.role_id
     JOIN "user" u ON u.role = r.name
     WHERE u.id = ?`
  );
  const result = await statement.bind(userId, userId).all<{ name: Permission }>();
  return (result.results ?? []).map((row) => row.name);
}

export function requirePermission(permission: Permission) {
  return createMiddleware<{ Bindings: RbacEnv }>(async (c, next) => {
    let auth;
    try {
      auth = createAuth(c.env);
    } catch {
      return c.json({ error: 'forbidden' }, 403);
    }

    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json({ error: 'forbidden' }, 403);
    }

    const permissions = await getUserPermissions(c.env.DB, session.user.id);

    if (!permissions.includes(permission)) {
      return c.json({ error: 'forbidden' }, 403);
    }

    c.set('user' as never, session.user as never);
    return await next();
  });
}
