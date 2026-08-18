import { describe, it, expect } from 'vitest';
import type { ModuleManifest } from './index.js';

describe('schemas', () => {
  it('exports module manifest type shape', () => {
    const manifest: ModuleManifest = {
      schemaVersion: 1,
      id: 'auth',
      version: '0.1.0',
      displayName: 'Authentication',
      description: 'Auth module',
      engine: '>=0.1.0 <0.2.0',
      starters: ['react-vite-hono-cloudflare'],
      requires: ['database-d1'],
      conflicts: [],
      capabilities: [],
      files: [],
      generatedContributions: [],
      packages: [],
      devPackages: [],
      environment: [],
      migrations: [],
      verification: [],
      routeContributions: [],
      webRouteContributions: [],
      documentation: 'docs/README.md',
    };
    expect(manifest.id).toBe('auth');
  });
});
