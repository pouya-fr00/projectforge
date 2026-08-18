import { describe, it, expect } from 'vitest';
import { createPlan, serializePlan, deserializePlan } from './index.js';
import type { ModuleManifest, ProjectState } from '@projectforge/schemas';

function makeModule(id: string, requires: string[] = []): ModuleManifest {
  return {
    schemaVersion: 1,
    id,
    version: '0.1.0',
    displayName: id,
    description: id,
    engine: '>=0.1.0 <0.2.0',
    starters: [],
    requires,
    conflicts: [],
    capabilities: [],
    files: [`${id}.txt`],
    generatedContributions: [],
    devPackages: [],
    routeContributions: [],
    webRouteContributions: [],
    packages: [`pkg-${id}`],
    environment: [`ENV_${id.toUpperCase()}`],
    migrations: [`migrations/${id}.sql`],
    verification: [`verify-${id}`],
    documentation: `docs/${id}.md`,
  };
}

function makeState(): ProjectState {
  return {
    schemaVersion: 1,
    root: '/tmp/project',
    config: {
      schemaVersion: 1,
      name: 'project',
      starter: 'starter',
      modules: ['auth'],
    },
    installedModules: [],
  };
}

describe('createPlan', () => {
  it('produces a plan with deterministic dependency order', () => {
    const db = makeModule('database-d1');
    const auth = makeModule('auth', ['database-d1']);
    const resolved = {
      order: ['database-d1', 'auth'],
      modules: new Map<string, ModuleManifest>([
        ['database-d1', db],
        ['auth', auth],
      ]),
    };
    const plan = createPlan({ state: makeState(), requested: ['auth'], resolved });
    expect(plan.dependencyOrder).toEqual(['database-d1', 'auth']);
    expect(plan.requestedModules).toEqual(['auth']);
  });

  it('generates file, package, env, migration and verification operations', () => {
    const db = makeModule('database-d1');
    const auth = makeModule('auth', ['database-d1']);
    const resolved = {
      order: ['database-d1', 'auth'],
      modules: new Map<string, ModuleManifest>([
        ['database-d1', db],
        ['auth', auth],
      ]),
    };
    const plan = createPlan({ state: makeState(), requested: ['auth'], resolved });
    // 2 module files + 2 generated features + 2 migration copies = 6
    expect(plan.fileOperations).toHaveLength(6);
    expect(plan.fileOperations.map((op) => op.targetPath)).toContain('database-d1.txt');
    expect(plan.fileOperations.map((op) => op.targetPath)).toContain('auth.txt');
    expect(plan.fileOperations.map((op) => op.targetPath)).toContain('apps/api/src/features/index.ts');
    expect(plan.fileOperations.map((op) => op.targetPath)).toContain('apps/web/src/features/index.tsx');
    expect(plan.fileOperations.map((op) => op.targetPath)).toContain('apps/api/migrations/database-d1.sql');
    expect(plan.fileOperations.map((op) => op.targetPath)).toContain('apps/api/migrations/auth.sql');
    expect(plan.packageOperations.map((op) => op.name)).toEqual(['pkg-auth', 'pkg-database-d1']);
    expect(plan.envKeys).toEqual(['ENV_AUTH', 'ENV_DATABASE-D1']);
    expect(plan.migrations).toEqual(['migrations/auth.sql', 'migrations/database-d1.sql']);
    expect(plan.verificationCommands).toEqual(['verify-auth', 'verify-database-d1']);
  });

  it('throws when project root is empty', () => {
    const state = makeState();
    state.root = '';
    const resolved = { order: [] as string[], modules: new Map<string, ModuleManifest>() };
    expect(() => createPlan({ state, requested: [], resolved })).toThrow('project root is empty');
  });

  it('rejects duplicate migration ids across modules', () => {
    const a = makeModule('a');
    const b = makeModule('b');
    a.migrations = ['migrations/0001_init.sql'];
    b.migrations = ['migrations/0001_init.sql'];
    const resolved = {
      order: ['a', 'b'],
      modules: new Map<string, ModuleManifest>([
        ['a', a],
        ['b', b],
      ]),
    };
    try {
      createPlan({ state: makeState(), requested: ['a', 'b'], resolved });
      expect.fail('expected duplicate migration error');
    } catch (err) {
      expect((err as { code: string }).code).toBe('PF_DUPLICATE_MIGRATION');
    }
  });

  it('rejects unsafe target paths with traversal', () => {
    const a = makeModule('a');
    a.files = ['../etc/passwd'];
    const resolved = {
      order: ['a'],
      modules: new Map<string, ModuleManifest>([['a', a]]),
    };
    expect(() => createPlan({ state: makeState(), requested: ['a'], resolved })).toThrow('unsafe target path');
  });

  it('rejects absolute target paths', () => {
    const a = makeModule('a');
    a.files = ['/etc/passwd'];
    const resolved = {
      order: ['a'],
      modules: new Map<string, ModuleManifest>([['a', a]]),
    };
    expect(() => createPlan({ state: makeState(), requested: ['a'], resolved })).toThrow('unsafe target path');
  });

  it('produces deterministic plan IDs across repeated runs', () => {
    const resolved = {
      order: ['auth'],
      modules: new Map<string, ModuleManifest>([['auth', makeModule('auth')]]),
    };
    const a = createPlan({ state: makeState(), requested: ['auth', 'rbac'], resolved });
    const b = createPlan({ state: makeState(), requested: ['rbac', 'auth'], resolved });
    expect(a.planId).toBe(b.planId);
    expect(a.planId).toBe('plan-auth-rbac');
  });
});

describe('plan serialization', () => {
  it('serializes and deserializes a plan deterministically', () => {
    const resolved = {
      order: ['auth'],
      modules: new Map<string, ModuleManifest>([['auth', makeModule('auth')]]),
    };
    const original = createPlan({ state: makeState(), requested: ['auth'], resolved });
    const serialized = serializePlan(original);
    const restored = deserializePlan(serialized);
    expect(restored.planId).toBe(original.planId);
    expect(restored.dependencyOrder).toEqual(original.dependencyOrder);
    expect(restored.fileOperations).toEqual(original.fileOperations);
    expect(restored.packageOperations).toEqual(original.packageOperations);
  });
});
