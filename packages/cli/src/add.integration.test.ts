import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCli, parseEnvelope } from './integration-helpers.js';

describe('projectforge add clean-room', () => {
  it('adds database-d1, auth, and rbac modules and writes files', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-add-'));
    try {
      const target = path.join(tmp, 'my-app');
      const createRes = await runCli(['--no-install', '--json', 'create', 'my-app', 'default'], tmp);
      expect(createRes.exitCode).toBe(0);

      const addRes = await runCli(['--no-install', '--json', 'add', 'database-d1', 'auth', 'rbac'], target);
      expect(addRes.exitCode).toBe(0);
      const envelope = parseEnvelope(addRes.stdout);
      expect(envelope.ok).toBe(true);

      expect(fs.existsSync(path.join(target, 'apps', 'api', 'src', 'features', 'database', 'index.ts'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'apps', 'api', 'src', 'features', 'auth', 'index.ts'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'apps', 'api', 'src', 'features', 'rbac', 'middleware.ts'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'apps', 'api', 'src', 'lib', 'auth.ts'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'packages', 'contracts', 'src', 'db.ts'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'packages', 'contracts', 'src', 'auth.ts'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'packages', 'contracts', 'src', 'rbac.ts'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'migrations', '0001_db_init.sql'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'migrations', '0003_rbac.sql'))).toBe(true);

      const lockRaw = fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8');
      const lock = JSON.parse(lockRaw);
      const moduleIds = lock.modules.map((m: { id: string }) => m.id).sort();
      expect(moduleIds).toEqual(['auth', 'database-d1', 'rbac']);

      const configRaw = fs.readFileSync(path.join(target, 'projectforge.json'), 'utf-8');
      const config = JSON.parse(configRaw);
      expect(config.modules.sort()).toEqual(['auth', 'database-d1', 'rbac']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects adding an unknown module', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-add-unknown-'));
    try {
      const target = path.join(tmp, 'my-app');
      await runCli(['--no-install', '--json', 'create', 'my-app', 'default'], tmp);
      const res = await runCli(['--no-install', '--json', 'add', 'unknown-module'], target);
      expect(res.exitCode).toBe(1);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('resolves transitive dependencies when adding a module', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-add-dep-'));
    try {
      const target = path.join(tmp, 'my-app');
      await runCli(['--no-install', '--json', 'create', 'my-app', 'default'], tmp);
      const res = await runCli(['--no-install', '--json', 'add', 'rbac'], target);
      expect(res.exitCode).toBe(0);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(true);
      const lockRaw = fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8');
      const lock = JSON.parse(lockRaw);
      const moduleIds = lock.modules.map((m: { id: string }) => m.id).sort();
      expect(moduleIds).toEqual(['auth', 'database-d1', 'rbac']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('adds a single module without unnecessary dependencies', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-add-single-'));
    try {
      const target = path.join(tmp, 'my-app');
      await runCli(['--no-install', '--json', 'create', 'my-app', 'default'], tmp);
      const res = await runCli(['--no-install', '--json', 'add', 'database-d1'], target);
      expect(res.exitCode).toBe(0);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(true);
      const lockRaw = fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8');
      const lock = JSON.parse(lockRaw);
      const moduleIds = lock.modules.map((m: { id: string }) => m.id).sort();
      expect(moduleIds).toEqual(['database-d1']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('remains deterministic when the same modules are added repeatedly', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-add-repeat-'));
    try {
      const target = path.join(tmp, 'my-app');
      await runCli(['--no-install', '--json', 'create', 'my-app', 'default'], tmp);
      await runCli(['--no-install', '--json', 'add', 'database-d1'], target);
      const firstLockRaw = fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8');
      const firstLock = JSON.parse(firstLockRaw);

      await runCli(['--no-install', '--json', 'add', 'database-d1'], target);
      const secondLockRaw = fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8');
      const secondLock = JSON.parse(secondLockRaw);

      expect(firstLock.modules.map((m: { id: string }) => m.id).sort()).toEqual(
        secondLock.modules.map((m: { id: string }) => m.id).sort()
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
