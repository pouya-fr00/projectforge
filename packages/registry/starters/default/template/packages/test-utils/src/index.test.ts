import { describe, it, expect } from 'vitest';
import { createTestContext } from './index.js';

describe('test-utils', () => {
  it('creates a ready context', () => {
    const ctx = createTestContext();
    expect(ctx.ready).toBe(true);
  });
});
