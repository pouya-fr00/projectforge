import { describe, it, expect } from 'vitest';
import { validateModuleManifest, validateProjectLock, validateProjectState, validateStarterManifest, SchemaValidationError } from './index.js';

function validModule() {
  return {
    schemaVersion: 1,
    id: 'auth',
    version: '0.1.0',
    displayName: 'Authentication',
    description: 'Auth module',
    engine: '>=0.1.0 <0.2.0',
    starters: ['react-vite-hono-cloudflare'],
    requires: ['database-d1'],
    conflicts: [],
    capabilities: [],      files: [],
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
}

function validStarter() {
  return {
    schemaVersion: 1,
    id: 'react-vite-hono-cloudflare',
    version: '0.1.0',
    displayName: 'React + Vite + Hono',
    description: 'Golden stack starter',
    compatibility: { engine: '>=0.1.0' },
    templateDir: 'template',
    files: [],
    templateOperations: [],
    verificationCommands: [],
    generatedOwnership: {
      factoryGenerated: [],
      features: [],
      extensions: [],
    },
  };
}

function validProjectState() {
  return {
    schemaVersion: 1,
    root: '/tmp/my-project',
    config: {
      schemaVersion: 1,
      name: 'my-project',
      starter: 'react-vite-hono-cloudflare',
      modules: ['auth'],
    },
    installedModules: ['auth'],
  };
}

function validLock() {
  return {
    schemaVersion: 1,
    engineVersion: '0.1.0',
    starter: { id: 'react-vite-hono-cloudflare', version: '0.1.0', checksum: 'sha256-starter' },
    modules: [{ id: 'auth', version: '0.1.0', checksum: 'sha256-auth' }],
    generatedChecksums: {},
    provenance: {},
    timestamp: new Date().toISOString(),
  };
}

describe('schema validation', () => {
  it('validates a module manifest', () => {
    expect(() => validateModuleManifest(validModule())).not.toThrow();
  });

  it('rejects empty module id', () => {
    const m = validModule();
    m.id = '';
    expect(() => validateModuleManifest(m)).toThrow(SchemaValidationError);
  });

  it('rejects invalid module id pattern', () => {
    const m = validModule();
    m.id = 'AuthModule';
    expect(() => validateModuleManifest(m)).toThrow(SchemaValidationError);
  });

  it('rejects invalid semver', () => {
    const m = validModule();
    m.version = 'not-a-version';
    expect(() => validateModuleManifest(m)).toThrow(SchemaValidationError);
  });

  it('validates a starter manifest', () => {
    expect(() => validateStarterManifest(validStarter())).not.toThrow();
  });

  it('validates a project state', () => {
    expect(() => validateProjectState(validProjectState())).not.toThrow();
  });

  it('rejects missing project root', () => {
    const s = validProjectState();
    s.root = '';
    expect(() => validateProjectState(s)).toThrow(SchemaValidationError);
  });

  it('validates a lock', () => {
    expect(() => validateProjectLock(validLock())).not.toThrow();
  });

  it('rejects a lock with invalid starter version', () => {
    const l = validLock();
    Object.assign(l, { starter: { id: 'bad-id', version: 'not-a-version', checksum: 'sha256' } });
    expect(() => validateProjectLock(l)).toThrow(SchemaValidationError);
  });

  it('rejects a lock with invalid module item', () => {
    const l = validLock();
    Object.assign(l, { modules: [{ id: 'bad-id', version: 'not-a-version', checksum: 'sha256' }] });
    expect(() => validateProjectLock(l)).toThrow(SchemaValidationError);
  });

  it('rejects a lock with empty checksum', () => {
    const l = validLock();
    Object.assign(l, { modules: [{ id: 'auth', version: '0.1.0', checksum: '' }] });
    expect(() => validateProjectLock(l)).toThrow(SchemaValidationError);
  });
});
