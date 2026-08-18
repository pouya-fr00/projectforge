import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCli, parseEnvelope } from './integration-helpers.js';

interface ModuleSpec {
  id: string;
  requires?: string[];
  conflicts?: string[];
  engine?: string;
  files?: string[];
  migrations?: string[];
  verification?: string[];
}

function writeModule(registryPath: string, spec: ModuleSpec, templateFiles: Record<string, string> = {}): void {
  const moduleDir = path.join(registryPath, 'modules', spec.id);
  fs.mkdirSync(moduleDir, { recursive: true });
  const manifest = {
    schemaVersion: 1,
    id: spec.id,
    version: '0.1.0',
    displayName: spec.id,
    description: spec.id,
    engine: spec.engine ?? '>=0.1.0',
    starters: [],
    requires: spec.requires ?? [],
    conflicts: spec.conflicts ?? [],
    capabilities: [],
    files: spec.files ?? ['index.txt'],
    generatedContributions: [],
    packages: [],
    devPackages: [],
    environment: [],
    migrations: spec.migrations ?? [],
    verification: spec.verification ?? [],
    routeContributions: [],
    webRouteContributions: [],
    documentation: `docs/${spec.id}.md`,
  };
  fs.writeFileSync(path.join(registryPath, 'modules', `${spec.id}.json`), JSON.stringify(manifest, null, 2) + '\n');
  const templateDir = path.join(moduleDir, 'template');
  for (const [filePath, content] of Object.entries(templateFiles)) {
    const fullPath = path.join(templateDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
}

function createRegistry(baseDir: string, modules: ModuleSpec[]): string {
  const registryPath = path.join(baseDir, 'registry');
  fs.mkdirSync(path.join(registryPath, 'modules'), { recursive: true });
  fs.mkdirSync(path.join(registryPath, 'starters'), { recursive: true });
  for (const m of modules) {
    writeModule(registryPath, m, { 'index.txt': `${m.id}\n` });
  }
  return registryPath;
}

function createProject(tmp: string): Promise<string> {
  return runCli(['--no-install', 'create', 'my-app', 'default'], tmp).then((res) => {
    if (res.exitCode !== 0) throw new Error(`create failed: ${res.stderr}`);
    return path.join(tmp, 'my-app');
  });
}

describe('pre-write failure handling', () => {
  it('rejects an unknown module and leaves project untouched', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-fail-unknown-'));
    try {
      const target = await createProject(tmp);
      const initial = fs.readdirSync(target).sort();
      const res = await runCli(['--no-install', '--json', 'add', 'unknown'], target, {
        PROJECTFORGE_REGISTRY: path.join(tmp, 'registry'),
      });
      expect(res.exitCode).toBe(1);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_MODULE_NOT_FOUND');
      expect(fs.readdirSync(target).sort()).toEqual(initial);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects a missing dependency and leaves project untouched', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-fail-missing-dep-'));
    try {
      const registryPath = createRegistry(tmp, [{ id: 'a', requires: ['does-not-exist'] }]);
      const target = await createProject(tmp);
      const initial = fs.readdirSync(target).sort();
      const res = await runCli(['--no-install', '--json', 'add', 'a'], target, { PROJECTFORGE_REGISTRY: registryPath });
      expect(res.exitCode).toBe(1);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_MODULE_NOT_FOUND');
      expect(fs.readdirSync(target).sort()).toEqual(initial);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects a dependency conflict and leaves project untouched', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-fail-conflict-'));
    try {
      const registryPath = createRegistry(tmp, [
        { id: 'a', conflicts: ['b'] },
        { id: 'b' },
      ]);
      const target = await createProject(tmp);
      const initial = fs.readdirSync(target).sort();
      const res = await runCli(['--no-install', '--json', 'add', 'a', 'b'], target, { PROJECTFORGE_REGISTRY: registryPath });
      expect(res.exitCode).toBe(1);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_MODULE_CONFLICT');
      expect(fs.readdirSync(target).sort()).toEqual(initial);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects an incompatible module and leaves project untouched', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-fail-incompatible-'));
    try {
      const registryPath = createRegistry(tmp, [{ id: 'future', engine: '>=99.0.0' }]);
      const target = await createProject(tmp);
      const initial = fs.readdirSync(target).sort();
      const res = await runCli(['--no-install', '--json', 'add', 'future'], target, { PROJECTFORGE_REGISTRY: registryPath });
      expect(res.exitCode).toBe(1);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_INCOMPATIBLE_VERSION');
      expect(fs.readdirSync(target).sort()).toEqual(initial);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects an invalid manifest and leaves project untouched', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-fail-invalid-manifest-'));
    try {
      const registryPath = path.join(tmp, 'registry');
      fs.mkdirSync(path.join(registryPath, 'modules'), { recursive: true });
      fs.writeFileSync(path.join(registryPath, 'modules', 'bad.json'), '{"invalid":true}');
      const target = await createProject(tmp);
      const initial = fs.readdirSync(target).sort();
      const res = await runCli(['--no-install', '--json', 'add', 'bad'], target, { PROJECTFORGE_REGISTRY: registryPath });
      expect(res.exitCode).toBe(1);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(false);
      expect(fs.readdirSync(target).sort()).toEqual(initial);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects an unsafe target path in a module manifest', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-fail-unsafe-path-'));
    try {
      const registryPath = createRegistry(tmp, [{ id: 'unsafe', files: ['../secret.txt'] }]);
      const target = await createProject(tmp);
      const initial = fs.readdirSync(target).sort();
      const res = await runCli(['--no-install', '--json', 'add', 'unsafe'], target, { PROJECTFORGE_REGISTRY: registryPath });
      expect(res.exitCode).toBe(1);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_PATH_ESCAPE');
      expect(fs.readdirSync(target).sort()).toEqual(initial);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects duplicate migration ids across modules', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-fail-dup-migration-'));
    try {
      const registryPath = createRegistry(tmp, [
        { id: 'a', migrations: ['0001_init.sql'] },
        { id: 'b', migrations: ['0001_init.sql'] },
      ]);
      const target = await createProject(tmp);
      const initial = fs.readdirSync(target).sort();
      const res = await runCli(['--no-install', '--json', 'add', 'a', 'b'], target, { PROJECTFORGE_REGISTRY: registryPath });
      expect(res.exitCode).toBe(1);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_DUPLICATE_MIGRATION');
      expect(fs.readdirSync(target).sort()).toEqual(initial);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rolls back when a template file is missing', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-fail-missing-template-'));
    try {
      const registryPath = path.join(tmp, 'registry');
      fs.mkdirSync(path.join(registryPath, 'modules'), { recursive: true });
      fs.writeFileSync(
        path.join(registryPath, 'modules', 'missing.json'),
        JSON.stringify({
          schemaVersion: 1,
          id: 'missing',
          version: '0.1.0',
          displayName: 'missing',
          description: 'missing',
          engine: '>=0.1.0',
          starters: [],
          requires: [],
          conflicts: [],
          capabilities: [],
          files: ['ghost.txt'],
          generatedContributions: [],
          packages: [],
          devPackages: [],
          environment: [],
          migrations: [],
          verification: [],
          routeContributions: [],
          webRouteContributions: [],
          documentation: 'docs/missing.md',
        }, null, 2) + '\n'
      );
      const target = await createProject(tmp);
      const res = await runCli(['--no-install', '--json', 'add', 'missing'], target, { PROJECTFORGE_REGISTRY: registryPath });
      expect(res.exitCode).toBe(1);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(false);
      expect(fs.existsSync(path.join(target, 'ghost.txt'))).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
