import { describe, it, expect } from 'vitest';
import type { AuthUser, AuthSession } from './auth.js';

describe('auth contracts', () => {
  it('defines a user and session', () => {
    const user: AuthUser = { id: '1', email: 'alice@example.com', name: 'Alice', role: 'user' };
    const session: AuthSession = {
      user,
      session: { id: 's1', token: 't1', expiresAt: Date.now() + 3600_000 },
    };
    expect(session.user.email).toBe('alice@example.com');
  });
});
