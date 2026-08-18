import { describe, it, expect } from 'vitest';
import { config } from './index.js';

describe('config', () => {
  it('provides a default API port', () => {
    expect(config.apiPort).toBe(8787);
  });
});
