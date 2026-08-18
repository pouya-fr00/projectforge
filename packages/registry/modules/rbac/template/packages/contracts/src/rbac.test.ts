import { describe, it, expect } from 'vitest';
import type { Permission } from './rbac.js';

describe('rbac contracts', () => {
  it('defines admin permission', () => {
    const permission: Permission = 'admin';
    expect(permission).toBe('admin');
  });
});
