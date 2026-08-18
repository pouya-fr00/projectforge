import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import { createD1Database } from '@workspace/test-utils/d1-mock';
import rbacApp from './index.js';
import authApp from '../auth/index.js';
import { seedRbac } from './seed.js';

const app = new Hono();
app.route('/api/auth', authApp);
app.route('/api/rbac', rbacApp);

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "emailVerified" INTEGER NOT NULL,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT PRIMARY KEY,
    "expiresAt" INTEGER NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" INTEGER,
    "refreshTokenExpiresAt" INTEGER,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" INTEGER NOT NULL,
    "createdAt" INTEGER,
    "updatedAt" INTEGER
  );`,
  `CREATE TABLE IF NOT EXISTS "roles" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL UNIQUE
  );`,
  `CREATE TABLE IF NOT EXISTS "permissions" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL UNIQUE
  );`,
  `CREATE TABLE IF NOT EXISTS "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    PRIMARY KEY ("role_id", "permission_id")
  );`,
  `CREATE TABLE IF NOT EXISTS "user_role" (
    "user_id" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    PRIMARY KEY ("user_id", "role_id")
  );`,
];

const env = {
  DB: createD1Database() as unknown as D1Database,
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
  BETTER_AUTH_URL: 'http://localhost',
};

async function signUpAndLogin(email: string, password: string, name: string) {
  const signup = await app.request(
    '/api/auth/sign-up/email',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ email, password, name }),
    },
    env
  );
  expect(signup.status).toBe(200);

  const login = await app.request(
    '/api/auth/sign-in/email',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
      body: JSON.stringify({ email, password }),
    },
    env
  );
  expect(login.status).toBe(200);
  return login.headers.get('set-cookie') ?? '';
}

describe('rbac feature', () => {
  beforeAll(async () => {
    for (const sql of SCHEMA_SQL) {
      env.DB.exec(sql);
    }
    await seedRbac(env.DB);
  });

  it('denies anonymous access to users endpoint', async () => {
    const res = await app.request('/api/rbac/users');
    expect(res.status).toBe(403);
  });

  it('denies anonymous access to health endpoint', async () => {
    const res = await app.request('/api/rbac/health');
    expect(res.status).toBe(403);
  });

  it('denies a normal user (no admin permission)', async () => {
    const cookie = await signUpAndLogin('user@example.com', 'password123', 'User');
    const res = await app.request('/api/rbac/users', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(403);
  });

  it('denies normal user on health endpoint', async () => {
    const cookie = await signUpAndLogin('user2@example.com', 'password123', 'User Two');
    const res = await app.request('/api/rbac/health', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(403);
  });

  it('allows an admin to access users endpoint and returns real user data', async () => {
    const cookie = await signUpAndLogin('admin@example.com', 'password123', 'Admin');
    // Promote the user to admin by updating their role in the user table.
    env.DB.exec(`UPDATE "user" SET role = 'admin' WHERE email = 'admin@example.com'`);
    // Seed a normal user so we can verify the list has at least one entry.
    env.DB.exec(`INSERT INTO "user" (id, name, email, "emailVerified", "role", "createdAt", "updatedAt") VALUES ('n1', 'Normal', 'normal@ex.com', 0, 'user', 1, 1)`);
    const res = await app.request('/api/rbac/users', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: Array<{ id: string; name: string; email: string; role: string }> };
    expect(body.users.length).toBeGreaterThanOrEqual(2);
    // Verify returned fields are safe (no password hashes, tokens, etc.)
    for (const u of body.users) {
      expect(u).toHaveProperty('id');
      expect(u).toHaveProperty('name');
      expect(u).toHaveProperty('email');
      expect(u).toHaveProperty('role');
      expect(u).not.toHaveProperty('password');
      expect(u).not.toHaveProperty('token');
    }
  });

  it('allows an admin to access health endpoint via user_role table', async () => {
    const signup = await app.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'admin2@example.com', password: 'password123', name: 'Admin Two' }),
      },
      env
    );
    expect(signup.status).toBe(200);
    const body = (await signup.json()) as { user: { id: string } };

    // Assign the admin role via the user_role table instead of the user.role column.
    const insert = env.DB.prepare(
      `INSERT INTO user_role (user_id, role_id) VALUES (?, (SELECT id FROM roles WHERE name = 'admin'))`
    );
    insert.bind(body.user.id).run();

    const login = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'admin2@example.com', password: 'password123' }),
      },
      env
    );
    expect(login.status).toBe(200);
    const cookie = login.headers.get('set-cookie') ?? '';

    const res = await app.request('/api/rbac/health', { headers: { Cookie: cookie } }, env);
    expect(res.status).toBe(200);
  });
});
