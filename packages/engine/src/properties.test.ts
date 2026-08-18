import { describe, it, expect } from 'vitest';
import { resolveModuleGraph } from './resolver.js';
import { createPlan, serializePlan, deserializePlan } from './planner.js';
import { resolveSafePath } from '@projectforge/schemas';
import { ProjectFactoryError } from '@projectforge/schemas';
import type { ModuleManifest, ProjectState } from '@projectforge/schemas';

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
    files: [`${id}.txt`],
    generatedContributions: [],
    devPackages: [],
    routeContributions: [],
    webRouteContributions: [],
    packages: [`pkg-${id}`],
    environment: [],
    migrations: [],
    verification: [],
    documentation: `docs/${id}.md`,
  };
}

function makeState(root = '/tmp/project'): ProjectState {
  return {
    schemaVersion: 1,
    root,
    config: { schemaVersion: 1, name: 'demo', starter: 'starter', modules: [] },
    installedModules: [],
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

describe('resolver properties', () => {
  it('produces the same order for repeated identical inputs', () => {
    const registry = new Map<string, ModuleManifest>([
      ['db', makeModule('db')],
      ['auth', makeModule('auth', ['db'])],
      ['api', makeModule('api', ['auth'])],
    ]);
    const getModule = (id: string) => registry.get(id);

    const runs: string[][] = [];
    for (let i = 0; i < 20; i++) {
      runs.push(resolveModuleGraph({ requested: ['api'], getModule }).order);
    }
    expect(new Set(runs.map((o) => o.join(','))).size).toBe(1);
  });

  it('never contains duplicate module ids', () => {
    const registry = new Map<string, ModuleManifest>([
      ['a', makeModule('a')],
      ['b', makeModule('b', ['a'])],
      ['c', makeModule('c', ['a', 'b'])],
    ]);
    const result = resolveModuleGraph({ requested: ['c'], getModule: (id) => registry.get(id) });
    expect(new Set(result.order)).toHaveLength(result.order.length);
  });

  it('places every dependency before its dependents', () => {
    const registry = new Map<string, ModuleManifest>([
      ['db', makeModule('db')],
      ['auth', makeModule('auth', ['db'])],
      ['ui', makeModule('ui', ['auth'])],
    ]);
    const result = resolveModuleGraph({ requested: ['ui'], getModule: (id) => registry.get(id) });
    const index = (id: string) => result.order.indexOf(id);
    expect(index('db')).toBeLessThan(index('auth'));
    expect(index('auth')).toBeLessThan(index('ui'));
  });

  it('is stable under permutation of requested order', () => {
    const registry = new Map<string, ModuleManifest>([
      ['db', makeModule('db')],
      ['auth', makeModule('auth', ['db'])],
      ['ui', makeModule('ui', ['auth'])],
    ]);
    const getModule = (id: string) => registry.get(id);

    const allOrderings: string[] = [];
    for (let i = 0; i < 20; i++) {
      const requested = shuffle(['ui', 'auth', 'db']);
      const order = resolveModuleGraph({ requested, getModule }).order.join(',');
      allOrderings.push(order);
    }

    // Topological order is unique and stable once requested set is fixed.
    expect(new Set(allOrderings).size).toBe(1);
  });
});

describe('planner properties', () => {
  it('preserves plan data through serialize/deserialize round-trip', () => {
    const registry = new Map<string, ModuleManifest>([
      ['db', makeModule('db')],
      ['auth', makeModule('auth', ['db'])],
    ]);
    const resolved = resolveModuleGraph({ requested: ['auth'], getModule: (id) => registry.get(id) });
    const plan = createPlan({ state: makeState(), requested: ['auth'], resolved });
    const roundTripped = deserializePlan(serializePlan(plan));
    expect(roundTripped.planId).toBe(plan.planId);
    expect(roundTripped.dependencyOrder).toEqual(plan.dependencyOrder);
    expect(roundTripped.fileOperations).toEqual(plan.fileOperations);
    expect(roundTripped.packageOperations).toEqual(plan.packageOperations);
  });
});

describe('webNavItems path normalization', () => {
  it('strips leading slashes from contribution paths', () => {
    // Real module manifests define webRouteContributions with leading slashes
    // (e.g. '/comments', '/dashboard', '/admin'). The planner must normalize
    // these to slashless route segments in webNavItems so that consumers —
    // Header, Home, visibility.ts — can construct links with `/${item.path}`
    // and match against canonical segment names.
    const withRoutes = (id: string, routes: { path: string; import: string }[]) => {
      const m = makeModule(id);
      m.webRouteContributions = routes;
      m.displayName = id;
      m.description = `${id} description`;
      return m;
    };

    const registry = new Map<string, ModuleManifest>([
      ['comments', withRoutes('comments', [{ path: '/comments', import: './comments/index' }])],
      ['dashboard', withRoutes('dashboard', [{ path: '/dashboard', import: './dashboard/index' }])],
      ['admin', withRoutes('admin', [{ path: '/admin', import: './admin/index' }])],
    ]);
    const resolved = resolveModuleGraph({ requested: ['comments', 'dashboard', 'admin'], getModule: (id) => registry.get(id) });
    const plan = createPlan({ state: makeState(), requested: ['comments', 'dashboard', 'admin'], resolved });

    const webFeaturesOp = plan.fileOperations.find(
      (op) => op.targetPath === 'apps/web/src/features/index.tsx'
    );
    expect(webFeaturesOp).toBeDefined();
    expect(webFeaturesOp!.content).toBeDefined();

    const content = webFeaturesOp!.content!;

    // webFeatures section should have leading slashes (these are React Router routes)
    const featuresIdx = content.indexOf('export const webFeatures');
    const navIdx = content.indexOf('export const webNavItems');
    expect(featuresIdx).toBeGreaterThan(-1);
    expect(navIdx).toBeGreaterThan(-1);

    // webFeatures section: paths have leading slashes for route matching
    const featuresSection = content.slice(featuresIdx, navIdx);
    expect(featuresSection).toContain("path: '/comments'");
    expect(featuresSection).toContain("path: '/dashboard'");
    expect(featuresSection).toContain("path: '/admin'");

    // webNavItems section: paths must NOT have leading slashes
    const navSection = content.slice(navIdx);
    const navLines = navSection.split('\n');
    const navPathLines = navLines.filter((l) => l.includes('path:'));
    expect(navPathLines.length).toBeGreaterThanOrEqual(3);
    for (const line of navPathLines) {
      expect(line).not.toMatch(/path:\s*'\//);
    }

    // Canonical segment names present (without leading slash)
    expect(navSection).toContain("path: 'comments'");
    expect(navSection).toContain("path: 'dashboard'");
    expect(navSection).toContain("path: 'admin'");
  });
});

describe('path-safety properties', () => {
  const root = '/tmp/project';

  it('rejects a generated sample of traversal attempts', () => {
    const unsafePaths = [
      '../escape',
      'a/../../escape',
      'b/../a/../../c',
    ];
    for (const p of unsafePaths) {
      expect(() => resolveSafePath(root, p)).toThrow(ProjectFactoryError);
    }
  });

  it('rejects a generated sample of absolute paths', () => {
    if (process.platform !== 'win32') {
      expect(() => resolveSafePath(root, '/etc/passwd')).toThrow(ProjectFactoryError);
    } else {
      expect(() => resolveSafePath(root, 'C:\\Windows')).toThrow(ProjectFactoryError);
    }
  });

  it('accepts a generated sample of safe relative paths', () => {
    const safePaths = ['src/index.ts', 'a/b/c.txt', 'README.md'];
    for (const p of safePaths) {
      expect(() => resolveSafePath(root, p)).not.toThrow();
    }
  });
});
