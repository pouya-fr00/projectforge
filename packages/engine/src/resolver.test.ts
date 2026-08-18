import { describe, it, expect } from 'vitest';
import { resolveModuleGraph, detectConflicts } from './index.js';
import { ProjectFactoryError, EngineErrors } from './index.js';
import type { ModuleManifest } from '@projectforge/schemas';

function makeModule(id: string, requires: string[] = [], conflicts: string[] = []): ModuleManifest {
  return {
    schemaVersion: 1,
    id,
    version: '0.1.0',
    displayName: id,
    description: id,
    engine: '>=0.1.0 <0.2.0',
    starters: [],
    requires,
    conflicts,
    capabilities: [],
    files: [],
    generatedContributions: [],
    devPackages: [],
    routeContributions: [],
    webRouteContributions: [],
    packages: [],
    environment: [],
    migrations: [],
    verification: [],
    documentation: `docs/${id}.md`,
  };
}

const registry = new Map<string, ModuleManifest>([
  ['database-d1', makeModule('database-d1')],
  ['auth', makeModule('auth', ['database-d1'])],
  ['rbac', makeModule('rbac', ['auth'])],
  ['user-dashboard', makeModule('user-dashboard', ['auth'])],
  ['admin-dashboard', makeModule('admin-dashboard', ['rbac'])],
  ['comments', makeModule('comments', ['auth', 'database-d1'])],
]);

function getModule(id: string): ModuleManifest | undefined {
  return registry.get(id);
}

describe('resolveModuleGraph', () => {
  it('resolves graph with no dependencies', () => {
    const result = resolveModuleGraph({ requested: ['database-d1'], getModule });
    expect(result.order).toEqual(['database-d1']);
  });

  it('resolves multi-level dependencies', () => {
    const result = resolveModuleGraph({ requested: ['admin-dashboard'], getModule });
    expect(result.order).toEqual(['database-d1', 'auth', 'rbac', 'admin-dashboard']);
  });

  it('resolves shared dependency once', () => {
    const result = resolveModuleGraph({ requested: ['user-dashboard', 'comments'], getModule });
    expect(result.order).toEqual(['database-d1', 'auth', 'user-dashboard', 'comments']);
  });

  it('throws on missing module', () => {
    expect(() =>
      resolveModuleGraph({ requested: ['unknown'], getModule })
    ).toThrow(ProjectFactoryError);
    try {
      resolveModuleGraph({ requested: ['unknown'], getModule });
    } catch (e) {
      expect((e as ProjectFactoryError).code).toBe(EngineErrors.MODULE_NOT_FOUND);
    }
  });

  it('throws on direct cycle', () => {
    const cyclic = new Map<string, ModuleManifest>(registry);
    cyclic.set('a', makeModule('a', ['b']));
    cyclic.set('b', makeModule('b', ['a']));
    expect(() =>
      resolveModuleGraph({ requested: ['a'], getModule: (id) => cyclic.get(id) })
    ).toThrow(ProjectFactoryError);
  });

  it('throws on indirect cycle', () => {
    const cyclic = new Map<string, ModuleManifest>(registry);
    cyclic.set('x', makeModule('x', ['y']));
    cyclic.set('y', makeModule('y', ['z']));
    cyclic.set('z', makeModule('z', ['x']));
    expect(() =>
      resolveModuleGraph({ requested: ['x'], getModule: (id) => cyclic.get(id) })
    ).toThrow(ProjectFactoryError);
  });

  it('throws on duplicate in strict mode', () => {
    expect(() =>
      resolveModuleGraph({ requested: ['auth', 'auth'], getModule, strictDuplicates: true })
    ).toThrow(ProjectFactoryError);
  });

  it('deduplicates duplicates in non-strict mode', () => {
    const result = resolveModuleGraph({ requested: ['auth', 'auth'], getModule });
    expect(result.order).toEqual(['database-d1', 'auth']);
  });

  it('produces stable output across repeated runs', () => {
    const r1 = resolveModuleGraph({ requested: ['admin-dashboard', 'comments'], getModule });
    const r2 = resolveModuleGraph({ requested: ['admin-dashboard', 'comments'], getModule });
    expect(r1.order).toEqual(r2.order);
    expect(r1.order).toEqual(['database-d1', 'auth', 'rbac', 'admin-dashboard', 'comments']);
  });
});

describe('detectConflicts', () => {
  it('throws when conflicting modules are both selected', () => {
    const a = makeModule('a', [], ['b']);
    const modules = new Map<string, ModuleManifest>([
      ['a', a],
      ['b', makeModule('b')],
    ]);
    expect(() => detectConflicts(['a', 'b'], modules)).toThrow(ProjectFactoryError);
  });

  it('does not throw when conflict is not selected', () => {
    expect(() => detectConflicts(['auth'], registry)).not.toThrow();
  });

  it('throws when a transitive dependency conflicts with a requested module', () => {
    const modules = new Map<string, ModuleManifest>([
      ['auth', makeModule('auth', [], ['monitoring'])],
      ['monitoring', makeModule('monitoring')],
    ]);
    expect(() =>
      resolveModuleGraph({ requested: ['auth', 'monitoring'], getModule: (id) => modules.get(id) })
    ).toThrow(ProjectFactoryError);
  });
});
