import { describe, it, expect } from 'vitest';
import type { HealthResponse } from './index.js';

describe('contracts', () => {
  it('exports a HealthResponse type', () => {
    const response: HealthResponse = { status: 'ok' };
    expect(response.status).toBe('ok');
  });
});
