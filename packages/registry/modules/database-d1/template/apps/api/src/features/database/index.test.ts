import { describe, it, expect } from 'vitest';
import app from './index.js';

describe('database feature', () => {
  it('reports db bound when binding is present', async () => {
    const db = {} as D1Database;
    const res = await app.request('/health/db', {}, { DB: db });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { status: string; bound: boolean };
    expect(json.status).toBe('ok');
    expect(json.bound).toBe(true);
  });

  it('returns 503 when binding is missing', async () => {
    const res = await app.request('/health/db', {}, {});
    expect(res.status).toBe(503);
  });
});
