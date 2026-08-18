import { describe, it, expect } from 'vitest';
import type { DatabaseEnv } from './db.js';

describe('database contracts', () => {
  it('defines a typed DB env', () => {
    const env: DatabaseEnv<{ query: () => void }> = { DB: { query: () => {} } };
    expect(env.DB).toBeDefined();
  });
});
