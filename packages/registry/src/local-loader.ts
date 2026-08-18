import fs from 'node:fs';
import path from 'node:path';
import type { ModuleManifest, StarterManifest, TemplateOperation } from '@projectforge/schemas';
import { ProjectFactoryError, SchemaValidationError, assertInsideProject, validateModuleManifest, validateStarterManifest } from '@projectforge/schemas';
import type { Registry } from './loader.js';

export const RegistryErrorCodes = {
  REGISTRY_LOAD_FAILED: 'PF_REGISTRY_LOAD_FAILED',
  REGISTRY_DUPLICATE_ID: 'PF_REGISTRY_DUPLICATE_ID',
  REGISTRY_INVALID_MANIFEST: 'PF_REGISTRY_INVALID_MANIFEST',
  REGISTRY_PATH_ESCAPE: 'PF_REGISTRY_PATH_ESCAPE',
} as const;

export interface LocalRegistryOptions {
  registryPath: string;
  modulesDir?: string;
  startersDir?: string;
}

function resolveSubDir(registryPath: string, subDir: string | undefined, defaultName: string): string {
  const absoluteRoot = path.resolve(registryPath);
  const candidate = subDir ? path.resolve(absoluteRoot, subDir) : path.resolve(absoluteRoot, defaultName);
  assertInsideProject(absoluteRoot, candidate);
  return candidate;
}

export class LocalRegistry implements Registry {
  private readonly registryPath: string;
  private readonly modulesDir: string;
  private readonly startersDir: string;
  private modules = new Map<string, ModuleManifest>();
  private starters = new Map<string, StarterManifest>();

  constructor(options: LocalRegistryOptions) {
    this.registryPath = path.resolve(options.registryPath);
    this.modulesDir = resolveSubDir(this.registryPath, options.modulesDir, 'modules');
    this.startersDir = resolveSubDir(this.registryPath, options.startersDir, 'starters');
  }

  load(): void {
    this.modules.clear();
    this.starters.clear();

    this.loadDirectory<ModuleManifest>(this.modulesDir, this.modules, (m) => validateModuleManifest(m));
    this.loadDirectory<StarterManifest>(this.startersDir, this.starters, (m) => validateStarterManifest(m));

    for (const starter of this.starters.values()) {
      this.populateStarterTemplate(starter);
    }
  }

  private loadDirectory<T extends { id: string }>(
    dir: string,
    target: Map<string, T>,
    validate: (manifest: unknown) => asserts manifest is T
  ): void {
    if (!fs.existsSync(dir)) {
      // A missing directory simply means no manifests of this type.
      return;
    }

    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch (e) {
      throw new ProjectFactoryError(
        RegistryErrorCodes.REGISTRY_LOAD_FAILED,
        `cannot read registry directory: ${dir}`,
        { dir, cause: (e as Error).message }
      );
    }

    const files = entries
      .filter((f) => f.endsWith('.json'))
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      const relativePath = path.join(dir, file);

      let raw: string;
      try {
        raw = fs.readFileSync(relativePath, 'utf-8');
      } catch (e) {
        throw new ProjectFactoryError(
          RegistryErrorCodes.REGISTRY_LOAD_FAILED,
          `cannot read manifest file: ${relativePath}`,
          { path: relativePath, cause: (e as Error).message }
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        throw new ProjectFactoryError(
          RegistryErrorCodes.REGISTRY_INVALID_MANIFEST,
          `invalid JSON in manifest: ${relativePath}`,
          { path: relativePath, cause: (e as Error).message }
        );
      }

      try {
        validate(parsed);
      } catch (err) {
        if (err instanceof SchemaValidationError) {
          throw new ProjectFactoryError(
            RegistryErrorCodes.REGISTRY_INVALID_MANIFEST,
            `invalid manifest ${relativePath}: ${err.message}`,
            { path: relativePath, field: err.field, reason: err.reason }
          );
        }
        throw err;
      }

      const manifest = parsed as T;
      if (target.has(manifest.id)) {
        throw new ProjectFactoryError(
          RegistryErrorCodes.REGISTRY_DUPLICATE_ID,
          `duplicate manifest id "${manifest.id}" in ${relativePath}`,
          { id: manifest.id, path: relativePath }
        );
      }

      target.set(manifest.id, manifest);
    }
  }

  listStarters(): StarterManifest[] {
    return Array.from(this.starters.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  listModules(): ModuleManifest[] {
    return Array.from(this.modules.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  getStarter(id: string): StarterManifest | undefined {
    return this.starters.get(id);
  }

  getModule(id: string): ModuleManifest | undefined {
    return this.modules.get(id);
  }

  private populateStarterTemplate(starter: StarterManifest): void {
    const starterDir = path.join(this.startersDir, starter.id);
    const templateDir = path.resolve(starterDir, starter.templateDir ?? 'template');

    if (!fs.existsSync(templateDir)) {
      throw new ProjectFactoryError(
        RegistryErrorCodes.REGISTRY_INVALID_MANIFEST,
        `starter "${starter.id}" template directory is missing: ${templateDir}`,
        { starterId: starter.id, templateDir }
      );
    }

    starter.templateDir = templateDir;

    if (!starter.templateOperations || starter.templateOperations.length === 0) {
      starter.templateOperations = this.scanTemplateDir(templateDir);
    }

    if (!starter.files || starter.files.length === 0) {
      starter.files = starter.templateOperations.map((op) => op.target);
    }
  }

  private scanTemplateDir(dir: string, baseDir: string = dir): TemplateOperation[] {
    const operations: TemplateOperation[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        operations.push(...this.scanTemplateDir(fullPath, baseDir));
      } else {
        operations.push({
          source: relativePath,
          target: relativePath,
          kind: 'copy',
        });
      }
    }

    return operations;
  }
}
