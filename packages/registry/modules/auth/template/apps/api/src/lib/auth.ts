import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { schema } from '../db/schema.js';

export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}

export function createAuth(env: AuthEnv) {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('PF_AUTH_SECRET_MISSING: BETTER_AUTH_SECRET is required');
  }
  const baseURL = env.BETTER_AUTH_URL;
  if (!baseURL) {
    throw new Error('PF_AUTH_URL_MISSING: BETTER_AUTH_URL is required');
  }

  const db = drizzle(env.DB, { schema });

  // When running locally, also trust the Vite dev server origin
  // so the Web app can proxy /api requests through the Vite dev server.
  const trustedOrigins: string[] = [baseURL];
  const baseHost = (() => {
    try {
      return new URL(baseURL).hostname;
    } catch {
      return '';
    }
  })();
  if (baseHost === 'localhost' || baseHost === '127.0.0.1' || baseHost === '[::1]' || baseHost === '::1') {
    trustedOrigins.push('http://localhost:5173');
  }

  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    secret,
    baseURL,
    emailAndPassword: { enabled: true },
    trustedOrigins,
    cookie: {
      attributes: {
        httpOnly: true,
        secure: baseURL.startsWith('https:'),
        sameSite: 'lax',
        path: '/',
      },
    },
  });
}
