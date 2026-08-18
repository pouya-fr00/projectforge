import { drizzle } from 'drizzle-orm/d1';
import { schema } from './schema.js';

export interface Env {
  DB: D1Database;
}

export function createDb(env: Env) {
  return drizzle(env.DB, { schema });
}
