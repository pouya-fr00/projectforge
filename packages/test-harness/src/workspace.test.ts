import { describe, it, expect } from 'vitest';
import { createTempWorkspace } from './index.js';

describe('test-harness workspace', () => {
  it('creates a temporary workspace', () => {
    const workspace = createTempWorkspace();
    expect(workspace.root).toBeTruthy();
    workspace.cleanup();
  });
});
