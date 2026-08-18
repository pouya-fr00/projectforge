import path from 'node:path';
import type { ProjectState, StarterManifest, ModuleManifest } from '@projectforge/schemas';
import { ProjectFactoryError, EngineErrors } from './errors.js';
import type { ResolvedGraph } from './resolver.js';

export type FileOwnership = 'factory-generated' | 'module-managed' | 'user-owned' | 'extension-point' | 'unknown';
export type FileClassification = 'generated' | 'managed' | 'user' | 'extension' | 'unknown';

export interface FileProvenance {
  ownerId: string;
  ownerVersion: string;
  operation: string;
  classification: FileClassification;
  ownership: FileOwnership;
}

export interface FileOperation {
  kind: 'copy' | 'render' | 'remove';
  sourcePath?: string;
  targetPath: string;
  content?: string;
  variables?: Record<string, string>;
  provenance?: FileProvenance;
}

export interface PackageOperation {
  kind: 'add' | 'addDev' | 'remove' | 'install';
  name: string;
  version?: string;
  /** Relative path from project root to the workspace package.json to mutate. */
  targetManifest: string;
}

export interface Plan {
  planId: string;
  requestedModules: string[];
  dependencyOrder: string[];
  fileOperations: FileOperation[];
  packageOperations: PackageOperation[];
  envKeys: string[];
  migrations: string[];
  verificationCommands: string[];
  warnings: string[];
}

export interface CreatePlanOptions {
  state: ProjectState;
  requested: string[];
  resolved: ResolvedGraph;
  /**
   * Absolute path to the registry root. Module templates are resolved from
   * `<registryPath>/modules/<id>/<templateDir>/<file>`. If omitted, source
   * paths are left as relative strings.
   */
  registryPath?: string;
}

/**
 * Pure plan generation. No filesystem mutation.
 *
 * Given a resolved module graph, produce a deterministic, serializable plan
 * describing all operations needed to apply the requested modules.
 */
export function createPlan(options: CreatePlanOptions): Plan {
  const { state, requested, resolved, registryPath } = options;

  if (!state.root) {
    throw new ProjectFactoryError(EngineErrors.INVALID_PATH, 'project root is empty', { root: state.root });
  }

  const fileOperations: FileOperation[] = [];
  const packageOperations: PackageOperation[] = [];
  const envKeys: string[] = [];
  const migrations: string[] = [];
  const verificationCommands: string[] = [];
  const warnings: string[] = [];

  for (const id of resolved.order) {
    const module = resolved.modules.get(id);
    if (!module) {
      throw new ProjectFactoryError(EngineErrors.MODULE_NOT_FOUND, `missing resolved module: ${id}`, { id });
    }

    // Note: modules already installed (state.installedModules) are still
    // processed here so their managed files are integrity-checked and re-copied
    // (idempotent content) on every add. Skipping them would let a user
    // modification of a previously installed module's managed file pass
    // silently, breaking the PF_USER_MODIFIED_MANAGED_FILE contract.
    // The resolved set used for `add` is the union of installed + requested
    // (see commands.ts buildPlan), so the generated aggregators below keep ALL
    // installed modules' routes.
    const moduleTemplateDir = path.resolve(
      registryPath ?? '',
      'modules',
      id,
      module.templateDir ?? 'template'
    );

    for (const file of module.files) {
      fileOperations.push({
        kind: 'copy',
        sourcePath: path.join(moduleTemplateDir, file),
        targetPath: file,
        provenance: {
          ownerId: module.id,
          ownerVersion: module.version,
          operation: 'copy',
          classification: 'managed',
          ownership: 'module-managed',
        },
      });
    }

    for (const pkg of module.packages) {
      packageOperations.push({ kind: 'add', name: pkg, targetManifest: 'apps/api/package.json' });
    }

    for (const pkg of module.devPackages) {
      packageOperations.push({ kind: 'addDev', name: pkg, targetManifest: 'apps/api/package.json' });
    }

    for (const key of module.environment) {
      if (!envKeys.includes(key)) {
        envKeys.push(key);
      }
    }

    for (const migration of module.migrations) {
      if (!migrations.includes(migration)) {
        migrations.push(migration);
      }
    }

    for (const command of module.verification) {
      if (!verificationCommands.includes(command)) {
        verificationCommands.push(command);
      }
    }
  }

  validateFileOperations(fileOperations);
  validatePackageOperations(packageOperations);
  validateMigrations(resolved.modules);

  // Generate the deterministic API feature router aggregator.
  fileOperations.push(createFeaturesIndexOperation(resolved));

  // Generate the deterministic web route registry.
  fileOperations.push(createWebFeaturesIndexOperation(resolved));

  // Deduplicate package operations while preserving deterministic order.
  const dedupedPackageOperations = dedupePackageOperations(packageOperations);
  packageOperations.length = 0;
  packageOperations.push(...dedupedPackageOperations);

  // Deterministic sort to ensure idempotency.
  packageOperations.sort((a, b) => a.name.localeCompare(b.name) || a.targetManifest.localeCompare(b.targetManifest));
  envKeys.sort((a, b) => a.localeCompare(b));
  migrations.sort((a, b) => a.localeCompare(b));
  verificationCommands.sort((a, b) => a.localeCompare(b));

  // For each migration SQL file, also copy it into apps/api/migrations/ so
  // Wrangler D1 finds it at the default location (relative to wrangler.jsonc).
  // The project-root migrations/ copy is preserved for `node migrations/runner.mjs`.
  // Find the owning module for each migration and use its template directory.
  for (const migration of migrations) {
    const owningModule = [...resolved.modules.values()].find((m) => m.migrations.includes(migration));
    if (!owningModule) continue;
    const basename = path.basename(migration);
    const moduleTemplateDir = path.resolve(
      registryPath ?? '',
      'modules',
      owningModule.id,
      owningModule.templateDir ?? 'template'
    );
    fileOperations.push({
      kind: 'copy',
      sourcePath: path.join(moduleTemplateDir, migration),
      targetPath: `apps/api/migrations/${basename}`,
      provenance: {
        ownerId: owningModule.id,
        ownerVersion: owningModule.version,
        operation: 'copy',
        classification: 'managed',
        ownership: 'module-managed',
      },
    });
  }

  const idSuffix = [...requested].sort().join('-');

  return {
    planId: idSuffix ? `plan-${idSuffix}` : 'plan-empty',
    requestedModules: [...requested],
    dependencyOrder: [...resolved.order],
    fileOperations,
    packageOperations,
    envKeys,
    migrations,
    verificationCommands,
    warnings,
  };
}

export function serializePlan(plan: Plan): string {
  return JSON.stringify(plan, null, 2);
}

export function deserializePlan(serialized: string): Plan {
  return JSON.parse(serialized) as Plan;
}

function createFeaturesIndexOperation(resolved: ResolvedGraph): FileOperation {
  const imports: string[] = [];
  const features: string[] = [];
  const usedNames = new Set<string>();

  for (const id of resolved.order) {
    const module = resolved.modules.get(id);
    if (!module) continue;
    for (const contribution of module.routeContributions) {
      const importPath = contribution.import;
      const match = /\.\/([^/]+)\/index\.js$/.exec(importPath);
      const baseName = match ? match[1] : id;
      let name = baseName.replace(/[^a-zA-Z0-9]/g, '_');
      let counter = 1;
      while (usedNames.has(name)) {
        name = `${baseName}_${counter}`;
        counter += 1;
      }
      usedNames.add(name);
      imports.push(`import ${name} from '${importPath}';`);
      features.push(`  { path: '${contribution.path}', router: ${name} },`);
    }
  }

  const content = [
    '// This file is auto-generated by Project Factory. Do not edit manually.',
    imports.join('\n'),
    '',
    'export interface ApiFeature {',
    '  path: string;',
    '  // eslint-disable-next-line @typescript-eslint/no-explicit-any',
    '  router: any;',
    '}',
    '',
    'export const features: ApiFeature[] = [',
    ...features,
    '];',
    '',
  ].join('\n');

  return {
    kind: 'render',
    targetPath: 'apps/api/src/features/index.ts',
    content,
    provenance: {
      ownerId: 'projectforge',
      ownerVersion: '0.1.0',
      operation: 'render',
      classification: 'generated',
      ownership: 'factory-generated',
    },
  };
}

function createWebFeaturesIndexOperation(resolved: ResolvedGraph): FileOperation {
  const imports: string[] = [];
  const features: string[] = [];
  const usedNames = new Set<string>();

  for (const id of resolved.order) {
    const module = resolved.modules.get(id);
    if (!module) continue;
    for (const contribution of module.webRouteContributions) {
      const importPath = contribution.import;
      const match = /\.\/([^/]+)\/index$/.exec(importPath) || /\.\/([^/]+)$/.exec(importPath);
      const baseName = match ? match[1] : id;
      let name = toPascalCase(baseName).replace(/[^a-zA-Z0-9]/g, '_');
      let counter = 1;
      while (usedNames.has(name)) {
        name = `${toPascalCase(baseName)}_${counter}`;
        counter += 1;
      }
      usedNames.add(name);
      imports.push(`import ${name} from '${importPath}';`);
      features.push(`  { path: '${contribution.path}', element: <${name} /> },`);
    }
  }

  const navItems: string[] = [];
  for (const id of resolved.order) {
    const module = resolved.modules.get(id);
    if (!module) continue;
    for (const contribution of module.webRouteContributions) {
      const title = module.displayName || toPascalCase(contribution.path);
      const desc = module.description || '';
      // Normalize: webNavItems paths are route segments WITHOUT a leading slash.
      // Consumers prepend '/' for link construction. visibility.ts matches on the
      // slashless segment (e.g. 'comments' not '/comments').
      const navPath = contribution.path.replace(/^\//, '');
      navItems.push(`  { path: '${navPath}', title: '${title.replace(/'/g, "\\'")}', description: '${desc.replace(/'/g, "\\'")}' },`);
    }
  }

  const content = [
    '// This file is auto-generated by Project Factory. Do not edit manually.',
    "import React from 'react';",
    imports.join('\n'),
    '',
    'export interface WebFeature {',
    '  path: string;',
    '  element: React.ReactNode;',
    '}',
    '',
    'export interface WebNavItem {',
    '  path: string;',
    '  title: string;',
    '  description: string;',
    '}',
    '',
    'export const webFeatures: WebFeature[] = [',
    ...features,
    '];',
    '',
    'export const webNavItems: WebNavItem[] = [',
    ...navItems,
    '];',
    '',
  ].join('\n');

  return {
    kind: 'render',
    targetPath: 'apps/web/src/features/index.tsx',
    content,
    provenance: {
      ownerId: 'projectforge',
      ownerVersion: '0.1.0',
      operation: 'render',
      classification: 'generated',
      ownership: 'factory-generated',
    },
  };
}

function toPascalCase(value: string): string {
  return value.replace(/(?:^|[-_])([a-z])/g, (_, char) => char.toUpperCase());
}

function hasPathTraversal(targetPath: string): boolean {
  const normalized = path.normalize(targetPath).replace(/\\/g, '/');
  return normalized.split('/').some((segment) => segment === '..');
}

function isUnsafeTargetPath(targetPath: string): boolean {
  if (path.isAbsolute(targetPath)) return true;
  return hasPathTraversal(targetPath);
}

function validatePackageOperations(operations: PackageOperation[]): void {
  for (const op of operations) {
    if (path.isAbsolute(op.targetManifest) || op.targetManifest.split('/').includes('..')) {
      throw new ProjectFactoryError(
        EngineErrors.PATH_ESCAPE,
        `unsafe target manifest path: ${op.targetManifest}`,
        { targetManifest: op.targetManifest }
      );
    }
  }
}

function validateFileOperations(fileOperations: FileOperation[]): void {
  for (const op of fileOperations) {
    if (isUnsafeTargetPath(op.targetPath)) {
      throw new ProjectFactoryError(
        EngineErrors.PATH_ESCAPE,
        `unsafe target path in module manifest: ${op.targetPath}`,
        { targetPath: op.targetPath }
      );
    }
    if (op.sourcePath && hasPathTraversal(op.sourcePath)) {
      throw new ProjectFactoryError(
        EngineErrors.PATH_ESCAPE,
        `unsafe source path in module manifest: ${op.sourcePath}`,
        { sourcePath: op.sourcePath }
      );
    }
  }
}

function validateMigrations(modules: Map<string, ModuleManifest>): void {
  const seen = new Map<string, string>();
  for (const [id, module] of modules) {
    for (const migration of module.migrations) {
      const firstOwner = seen.get(migration);
      if (firstOwner && firstOwner !== id) {
        throw new ProjectFactoryError(
          EngineErrors.DUPLICATE_MIGRATION,
          `duplicate migration "${migration}" declared by modules "${firstOwner}" and "${id}"`,
          { migration, modules: [firstOwner, id] }
        );
      }
      seen.set(migration, id);
    }
  }
}

function dedupePackageOperations(operations: PackageOperation[]): PackageOperation[] {
  const seen = new Set<string>();
  const result: PackageOperation[] = [];
  for (const op of operations) {
    const key = `${op.kind}:${op.name}:${op.targetManifest}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(op);
    }
  }
  return result;
}

export interface StarterPlanOptions {
  starter: StarterManifest;
  projectRoot: string;
  projectName: string;
}

export function createStarterPlan(options: StarterPlanOptions): Plan {
  const { starter, projectRoot, projectName } = options;
  const templateDir = path.resolve(projectRoot, starter.templateDir ?? 'template');

  const fileOperations: FileOperation[] = [];

  const variables: Record<string, string> = {
    PROJECT_NAME: projectName,
    PROJECT_STARTER: starter.id,
  };

  for (const op of starter.templateOperations) {
    const sourcePath = path.join(templateDir, op.source);
    const targetPath = op.target;

    fileOperations.push({
      kind: 'render',
      sourcePath,
      targetPath,
      variables,
      provenance: {
        ownerId: starter.id,
        ownerVersion: starter.version,
        operation: 'render',
        classification: 'generated',
        ownership: 'factory-generated',
      },
    });
  }

  const verificationCommands = [...starter.verificationCommands];

  fileOperations.push({
    kind: 'render',
    targetPath: 'apps/api/src/features/index.ts',
    content: [
      '// This file is auto-generated by Project Factory. Do not edit manually.',
      'export interface ApiFeature {',
      '  path: string;',
      '  // eslint-disable-next-line @typescript-eslint/no-explicit-any',
      '  router: any;',
      '}',
      '',
      'export const features: ApiFeature[] = [];',
      '',
    ].join('\n'),
  });

  fileOperations.push({
    kind: 'render',
    targetPath: 'apps/web/src/features/index.tsx',
    content: [
      '// This file is auto-generated by Project Factory. Do not edit manually.',
      "import React from 'react';",
      '',
      'export interface WebFeature {',
      '  path: string;',
      '  element: React.ReactNode;',
      '}',
      '',
      'export interface WebNavItem {',
      '  path: string;',
      '  title: string;',
      '  description: string;',
      '}',
      '',
      'export const webFeatures: WebFeature[] = [];',
      '',
      'export const webNavItems: WebNavItem[] = [];',
      '',
    ].join('\n'),
    provenance: {
      ownerId: starter.id,
      ownerVersion: starter.version,
      operation: 'render',
      classification: 'generated',
      ownership: 'factory-generated',
    },
  });

  return {
    planId: `starter-${starter.id}`,
    requestedModules: [],
    dependencyOrder: [],
    fileOperations,
    packageOperations: [{ kind: 'install', name: 'workspace', targetManifest: 'package.json' }],
    envKeys: [],
    migrations: [],
    verificationCommands,
    warnings: [],
  };
}
