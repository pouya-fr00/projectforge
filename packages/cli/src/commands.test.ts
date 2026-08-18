import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { commands } from './index.js';
import { createOutput } from './output.js';

import { ENGINE_VERSION } from '@projectforge/engine';

describe('cli commands', () => {
  it('registers all V1 commands', () => {
    expect(Object.keys(commands).sort()).toEqual([
      'create',
      'add',
      'sync',
      'status',
      'doctor',
      'plan',
      'list',
      'explain',
      'upgrade',
      'help',
    ].sort());
  });

  it('create returns usage error when name is missing', async () => {
    const out = createOutput({ json: false });
    const result = await commands.create({
      args: [],
      cwd: process.cwd(),
      json: false,
      noColor: false,
      verbose: false,
      dryRun: false,
      noInstall: false,
      out,
      registryPath: process.cwd(),
    });
    expect(result).toBe(2);
  });

  it('create rejects path traversal in project name', async () => {
    const out = createOutput({ json: false });
    const result = await commands.create({
      args: ['../bad-name'],
      cwd: process.cwd(),
      json: false,
      noColor: false,
      verbose: false,
      dryRun: false,
      noInstall: false,
      out,
      registryPath: process.cwd(),
    });
    expect(result).toBe(1);
  });

  it('create rejects path separators in project name', async () => {
    const out = createOutput({ json: false });
    const result = await commands.create({
      args: ['src/project'],
      cwd: process.cwd(),
      json: false,
      noColor: false,
      verbose: false,
      dryRun: false,
      noInstall: false,
      out,
      registryPath: process.cwd(),
    });
    expect(result).toBe(1);
  });

  describe('lock.engineVersion normalization', { timeout: 120_000 }, () => {
    let tmpDir = '';

    beforeAll(async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-engineversion-test-'));
      // Create a minimal project with a transitional lock (engineVersion: 0.0.0, from 858d371)
      fs.mkdirSync(path.join(tmpDir, 'apps', 'api'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'apps', 'api', 'package.json'), JSON.stringify({ name: 'test-api', dependencies: {} }, null, 2));
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-project', private: true }, null, 2));
      fs.writeFileSync(
        path.join(tmpDir, 'projectforge.json'),
        JSON.stringify({ schemaVersion: 1, name: 'test-project', starter: 'default', modules: ['database-d1', 'auth', 'rbac'] }, null, 2),
      );
      // Stale lock from 858d371 era
      fs.writeFileSync(
        path.join(tmpDir, 'projectforge-lock.json'),
        JSON.stringify({
          schemaVersion: 1,
          engineVersion: '0.0.0',
          starter: { id: 'default', version: '0.1.0', checksum: 'abc' },
          modules: [
            { id: 'database-d1', version: '0.1.0', checksum: 'abc' },
            { id: 'auth', version: '0.1.0', checksum: 'abc' },
            { id: 'rbac', version: '0.1.0', checksum: 'abc' },
          ],
          generatedChecksums: {},
          provenance: {},
          timestamp: new Date().toISOString(),
        }, null, 2),
      );
    });

    afterAll(() => {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ok */ }
    });

    it('normalizes a transitional 0.0.0 lock to ENGINE_VERSION on successful add', async () => {
      const out = createOutput({ json: false });
      const result = await commands.add({
        args: ['comments', '--no-install'],
        cwd: tmpDir,
        json: false,
        noColor: false,
        verbose: false,
        dryRun: false,
        noInstall: true,
        out,
        registryPath: path.resolve(import.meta.dirname ?? __dirname, '..', '..', '..', 'packages', 'registry'),
      });
      expect(result).toBe(0);

      // Verify lock was normalized to ENGINE_VERSION
      const lockRaw = fs.readFileSync(path.join(tmpDir, 'projectforge-lock.json'), 'utf-8');
      const lock = JSON.parse(lockRaw);
      expect(lock.engineVersion).toBe(ENGINE_VERSION);
    });

    it('ENGINE_VERSION and CLI package version are both defined', () => {
      // ENGINE_VERSION comes from compatibility.ts — a separate concept from package.json version
      // They may or may not be equal at any given release point.
      expect(ENGINE_VERSION).toBe('0.1.0');
      const pkg = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname ?? __dirname, '..', 'package.json'), 'utf-8'));
      expect(pkg.version).toBe('0.1.0');
      expect(ENGINE_VERSION).toBeDefined();
      expect(pkg.version).toBeDefined();
    });
  });
});
