import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import { createD1Database } from '@workspace/test-utils/d1-mock';
import authApp from './index.js';
import { createAuth } from '../../lib/auth.js';

// The auth sub-app is mounted at /api/auth in production. Wrap it the same way
// in tests so Better Auth sees the request paths it expects.
const app = new Hono();
app.route('/api/auth', authApp);

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
];

const env = {
  DB: createD1Database() as unknown as D1Database,
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
  BETTER_AUTH_URL: 'http://localhost',
};

describe('auth feature', () => {
  beforeAll(async () => {
    for (const sql of SCHEMA_SQL) {
      env.DB.exec(sql);
    }
  });

  it('throws a stable error when the auth secret is missing', () => {
    expect(() => createAuth({ DB: env.DB, BETTER_AUTH_SECRET: '', BETTER_AUTH_URL: 'http://localhost' })).toThrow(
      'PF_AUTH_SECRET_MISSING'
    );
  });

  it('throws a stable error when the auth URL is missing', () => {
    expect(() =>
      createAuth({ DB: env.DB, BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET, BETTER_AUTH_URL: '' })
    ).toThrow('PF_AUTH_URL_MISSING');
  });

  it('signs up, signs in, and returns the current user', async () => {
    const signup = await app.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'alice@example.com', password: 'password123', name: 'Alice' }),
      },
      env
    );
    expect(signup.status).toBe(200);

    const login = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'alice@example.com', password: 'password123' }),
      },
      env
    );
    expect(login.status).toBe(200);

    const setCookie = login.headers.get('set-cookie');
    const me = await app.request('/api/auth/me', { headers: { Cookie: setCookie ?? '' } }, env);
    expect(me.status).toBe(200);
    const body = (await me.json()) as { user: { email: string } };
    expect(body.user.email).toBe('alice@example.com');
  });

  it('returns role = user for a normal user on /me', async () => {
    const signup = await app.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'roleuser@example.com', password: 'password123', name: 'Role User' }),
      },
      env
    );
    expect(signup.status).toBe(200);

    const login = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'roleuser@example.com', password: 'password123' }),
      },
      env
    );
    expect(login.status).toBe(200);
    const setCookie = login.headers.get('set-cookie') ?? '';
    const me = await app.request('/api/auth/me', { headers: { Cookie: setCookie } }, env);
    expect(me.status).toBe(200);
    const body = (await me.json()) as { user: { role: string } };
    expect(body.user.role).toBe('user');
  });

  it('returns role = admin for a user with admin role on /me', async () => {
    const signup = await app.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'roleadmin@example.com', password: 'password123', name: 'Role Admin' }),
      },
      env
    );
    expect(signup.status).toBe(200);
    const signupBody = (await signup.json()) as { user: { id: string } };
    // Promote to admin via the user.role column.
    env.DB.exec(`UPDATE "user" SET role = 'admin' WHERE id = '${signupBody.user.id}'`);

    const login = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'roleadmin@example.com', password: 'password123' }),
      },
      env
    );
    expect(login.status).toBe(200);
    const setCookie = login.headers.get('set-cookie') ?? '';
    const me = await app.request('/api/auth/me', { headers: { Cookie: setCookie } }, env);
    expect(me.status).toBe(200);
    const body = (await me.json()) as { user: { role: string } };
    expect(body.user.role).toBe('admin');
  });

  it('does not expose sensitive auth fields in /me response', async () => {
    const signup = await app.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'safe@example.com', password: 'password123', name: 'Safe' }),
      },
      env
    );
    expect(signup.status).toBe(200);

    const login = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'safe@example.com', password: 'password123' }),
      },
      env
    );
    expect(login.status).toBe(200);
    const setCookie = login.headers.get('set-cookie') ?? '';
    const me = await app.request('/api/auth/me', { headers: { Cookie: setCookie } }, env);
    expect(me.status).toBe(200);
    const body = (await me.json()) as { user: Record<string, unknown> };
    expect(body.user).not.toHaveProperty('password');
    expect(body.user).not.toHaveProperty('token');
    expect(body.user).not.toHaveProperty('secret');
    expect(body.user).not.toHaveProperty('session');
  });

  it('rejects /me when no session is present', async () => {
    const me = await app.request('/api/auth/me', {}, env);
    expect(me.status).toBe(401);
  });

  it('rejects invalid credentials', async () => {
    const res = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'alice@example.com', password: 'wrong' }),
      },
      env
    );
    expect(res.status).toBe(401);
  });

  it('sets an HttpOnly session cookie after sign-in', async () => {
    const res = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'alice@example.com', password: 'password123' }),
      },
      env
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie.toLowerCase()).toContain('httponly');
  });

  it('signs out and invalidates the session', async () => {
    const login = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'alice@example.com', password: 'password123' }),
      },
      env
    );
    expect(login.status).toBe(200);
    const setCookie = login.headers.get('set-cookie') ?? '';

    const signOut = await app.request(
      '/api/auth/sign-out',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost', Cookie: setCookie },
      },
      env
    );
    expect(signOut.status).toBe(200);

    const me = await app.request('/api/auth/me', { headers: { Cookie: setCookie } }, env);
    expect(me.status).toBe(401);
  });

  it('does not allow a client-supplied role to escalate privileges', async () => {
    const signup = await app.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({
          email: 'mallory@example.com',
          password: 'password123',
          name: 'Mallory',
          role: 'admin',
        }),
      },
      env
    );
    expect(signup.status).toBe(200);
    const body = (await signup.json()) as { user: { role: string } };
    expect(body.user.role).not.toBe('admin');
  });

  it('allows sign-in from the trusted origin', async () => {
    await app.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'cors@example.com', password: 'password123', name: 'Cors' }),
      },
      env
    );
    const res = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'cors@example.com', password: 'password123' }),
      },
      env
    );
    expect(res.status).toBe(200);
  });

  it('rejects sign-in from an untrusted origin', async () => {
    await app.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'cors2@example.com', password: 'password123', name: 'Cors2' }),
      },
      env
    );
    const res = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://evil.com' },
        body: JSON.stringify({ email: 'cors2@example.com', password: 'password123' }),
      },
      env
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('PF_AUTH_UNTRUSTED_ORIGIN');
  });

  it('rejects a state-changing request without an origin header (CSRF protection)', async () => {
    await app.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'csrf@example.com', password: 'password123', name: 'Csrf' }),
      },
      env
    );
    const res = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'csrf@example.com', password: 'password123' }),
      },
      env
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('PF_AUTH_UNTRUSTED_ORIGIN');
  });

  it('sets an HttpOnly, SameSite=Lax, Path=/ session cookie', async () => {
    await app.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'cookie@example.com', password: 'password123', name: 'Cookie' }),
      },
      env
    );
    const res = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'http://localhost' },
        body: JSON.stringify({ email: 'cookie@example.com', password: 'password123' }),
      },
      env
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie.toLowerCase()).toContain('path=/');
  });

  it('sets Secure cookie attribute when baseURL is https', async () => {
    const secureEnv = {
      DB: env.DB,
      BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: 'https://example.com',
    };
    const secureApp = new Hono();
    secureApp.route('/api/auth', authApp);
    await secureApp.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://example.com' },
        body: JSON.stringify({ email: 'secure@example.com', password: 'password123', name: 'Secure' }),
      },
      secureEnv
    );
    const res = await secureApp.request(
      '/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://example.com' },
        body: JSON.stringify({ email: 'secure@example.com', password: 'password123' }),
      },
      secureEnv
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie.toLowerCase()).toContain('secure');
  });

  it('does not leak the auth secret in error messages', () => {
    const secret = 'ultra-secret-auth-token-12345';
    try {
      createAuth({ DB: env.DB, BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: '' });
      expect.fail('expected createAuth to throw');
    } catch (err) {
      expect(String(err)).not.toContain(secret);
      expect(String(err)).toContain('PF_AUTH_URL_MISSING');
    }
  });

  it('does not leak the auth secret when it is the missing value', () => {
    const secret = 'another-secret-value-67890';
    try {
      createAuth({ DB: env.DB, BETTER_AUTH_SECRET: '', BETTER_AUTH_URL: secret });
      expect.fail('expected createAuth to throw');
    } catch (err) {
      expect(String(err)).not.toContain(secret);
      expect(String(err)).toContain('PF_AUTH_SECRET_MISSING');
    }
  });

  it('responds to a trusted CORS preflight with 204 and CORS headers', async () => {
    const res = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost' },
      },
      env
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost');
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    expect(res.headers.get('access-control-allow-headers')).toContain('Content-Type');
  });

  it('rejects a CORS preflight from an untrusted origin', async () => {
    const res = await app.request(
      '/api/auth/sign-in/email',
      {
        method: 'OPTIONS',
        headers: { origin: 'http://evil.com' },
      },
      env
    );
    expect(res.status).toBe(403);
  });

  it('reflects CORS headers for a safe-method request from a trusted origin', async () => {
    const res = await app.request('/api/auth/me', { headers: { origin: 'http://localhost' } }, env);
    expect(res.status).toBe(401);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost');
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });
});
