import { describe, it, expect } from 'vitest';
import { createProject } from './index.js';

describe('create-project skeleton', () => {
  it('throws before Phase 1 implementation', async () => {
    await expect(createProject({ projectName: 'x', starter: 'default', targetDir: '.' })).rejects.toThrow(
      'not implemented in Phase 1'
    );
  });
});
