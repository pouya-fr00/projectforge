import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { LocalRegistry, BundledRegistry, RegistryErrorCodes } from './index.js';
import { ProjectFactoryError } from '@projectforge/schemas';

function moduleManifest(id: string) {
  return {
    schemaVersion: 1,
    id,
    version: '0.1.0',
    displayName: id,
    description: `${id} module`,
    engine: '>=0.1.0 <0.2.0',
    starters: [],
    requires: [],
    conflicts: [],
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

function starterManifest(id: string) {
  return {
    schemaVersion: 1,
    id,
    version: '0.1.0',
    displayName: id,
    description: `${id} starter`,
    compatibility: { engine: '>=0.1.0' },
    templateDir: 'template',
    files: [],
    templateOperations: [],
    verificationCommands: [],
    generatedOwnership: { factoryGenerated: [], features: [], extensions: [] },
  };
}

describe('LocalRegistry', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectforge-registry-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads valid module and starter manifests', () => {
    fs.mkdirSync(path.join(tmpDir, 'modules'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'starters'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'starters', 'web', 'template'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'modules', 'auth.json'), JSON.stringify(moduleManifest('auth')));
    fs.writeFileSync(path.join(tmpDir, 'starters', 'web.json'), JSON.stringify(starterManifest('web')));

    const registry = new LocalRegistry({ registryPath: tmpDir });
    registry.load();

    expect(registry.getModule('auth')).toBeDefined();
    expect(registry.getStarter('web')).toBeDefined();
    expect(registry.listModules()).toHaveLength(1);
    expect(registry.listStarters()).toHaveLength(1);
  });

  it('throws on invalid manifest', () => {
    fs.mkdirSync(path.join(tmpDir, 'modules'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'modules', 'bad.json'), JSON.stringify({ id: 'bad' }));

    const registry = new LocalRegistry({ registryPath: tmpDir });
    expect(() => registry.load()).toThrow(ProjectFactoryError);
    try {
      registry.load();
    } catch (e) {
      const err = e as ProjectFactoryError;
      expect(err.code).toBe(RegistryErrorCodes.REGISTRY_INVALID_MANIFEST);
    }
  });

  it('throws on duplicate id', () => {
    fs.mkdirSync(path.join(tmpDir, 'modules'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'modules', 'auth1.json'), JSON.stringify(moduleManifest('auth')));
    fs.writeFileSync(path.join(tmpDir, 'modules', 'auth2.json'), JSON.stringify(moduleManifest('auth')));

    const registry = new LocalRegistry({ registryPath: tmpDir });
    expect(() => registry.load()).toThrow(ProjectFactoryError);
    try {
      registry.load();
    } catch (e) {
      const err = e as ProjectFactoryError;
      expect(err.code).toBe(RegistryErrorCodes.REGISTRY_DUPLICATE_ID);
    }
  });

  it('returns stable sorted order', () => {
    fs.mkdirSync(path.join(tmpDir, 'modules'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'modules', 'zebra.json'), JSON.stringify(moduleManifest('zebra')));
    fs.writeFileSync(path.join(tmpDir, 'modules', 'alpha.json'), JSON.stringify(moduleManifest('alpha')));

    const registry = new LocalRegistry({ registryPath: tmpDir });
    registry.load();

    const ids = registry.listModules().map((m) => m.id);
    expect(ids).toEqual(['alpha', 'zebra']);
  });

  it('returns undefined for unknown ids', () => {
    fs.mkdirSync(path.join(tmpDir, 'modules'), { recursive: true });
    const registry = new LocalRegistry({ registryPath: tmpDir });
    registry.load();
    expect(registry.getModule('unknown')).toBeUndefined();
    expect(registry.getStarter('unknown')).toBeUndefined();
  });

  it('throws when registry directory cannot be read', () => {
    // Create a file where the modules directory should be, so readdir throws.
    const modulesDir = path.join(tmpDir, 'modules');
    fs.writeFileSync(modulesDir, 'not a directory');
    const registry = new LocalRegistry({ registryPath: tmpDir });
    expect(() => registry.load()).toThrow(ProjectFactoryError);
    try {
      registry.load();
    } catch (e) {
      const err = e as ProjectFactoryError;
      expect(err.code).toBe(RegistryErrorCodes.REGISTRY_LOAD_FAILED);
    }
  });

  it('throws when a configured directory escapes the registry root', () => {
    const outside = path.join(tmpDir, '..', 'projectforge-registry-outside');
    fs.mkdirSync(outside, { recursive: true });
    fs.writeFileSync(path.join(outside, 'x.json'), JSON.stringify(starterManifest('x')));
    try {
      expect(() =>
        new LocalRegistry({
          registryPath: tmpDir,
          startersDir: outside,
        })
      ).toThrow(ProjectFactoryError);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('BundledRegistry', () => {
  it('returns empty lists', () => {
    const registry = new BundledRegistry();
    expect(registry.listModules()).toEqual([]);
    expect(registry.listStarters()).toEqual([]);
    expect(registry.getModule('x')).toBeUndefined();
  });
});
