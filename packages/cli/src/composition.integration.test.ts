import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCli, parseEnvelope } from './integration-helpers.js';

function readModules(target: string): string[] {
  const lockRaw = fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8');
  const lock = JSON.parse(lockRaw);
  return lock.modules.map((m: { id: string }) => m.id).sort();
}

function readConfigModules(target: string): string[] {
  const configRaw = fs.readFileSync(path.join(target, 'projectforge.json'), 'utf-8');
  const config = JSON.parse(configRaw);
  return config.modules.sort();
}

describe('projectforge composition matrix', () => {
  it('direct auth adds transitive database-d1', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-compose-auth-'));
    try {
      const target = path.join(tmp, 'my-app');
      await runCli(['--no-install', 'create', 'my-app', 'default'], tmp);
      const res = await runCli(['--no-install', '--json', 'add', 'auth'], target);
      expect(res.exitCode).toBe(0);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(true);
      expect(readModules(target)).toEqual(['auth', 'database-d1']);
      expect(readConfigModules(target)).toEqual(['auth', 'database-d1']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('direct rbac adds transitive auth and database-d1', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-compose-rbac-'));
    try {
      const target = path.join(tmp, 'my-app');
      await runCli(['--no-install', 'create', 'my-app', 'default'], tmp);
      const res = await runCli(['--no-install', '--json', 'add', 'rbac'], target);
      expect(res.exitCode).toBe(0);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(true);
      expect(readModules(target)).toEqual(['auth', 'database-d1', 'rbac']);
      expect(readConfigModules(target)).toEqual(['auth', 'database-d1', 'rbac']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('repeated add is deterministic and no-op', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-compose-repeat-'));
    try {
      const target = path.join(tmp, 'my-app');
      await runCli(['--no-install', 'create', 'my-app', 'default'], tmp);
      await runCli(['--no-install', 'add', 'database-d1'], target);
      expect(readModules(target)).toEqual(['database-d1']);
      const firstLock = JSON.parse(fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8'));
      await runCli(['--no-install', 'add', 'database-d1'], target);
      expect(readModules(target)).toEqual(['database-d1']);
      const secondLock = JSON.parse(fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8'));
      // Timestamps may differ; compare deterministic fields.
      expect(secondLock.schemaVersion).toBe(firstLock.schemaVersion);
      expect(secondLock.engineVersion).toBe(firstLock.engineVersion);
      expect(secondLock.starter).toEqual(firstLock.starter);
      expect(secondLock.modules.map((m: { id: string }) => m.id).sort()).toEqual(
        firstLock.modules.map((m: { id: string }) => m.id).sort()
      );
      expect(secondLock.generatedChecksums).toEqual(firstLock.generatedChecksums);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('preserves unrelated user files during add', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-compose-unrelated-'));
    try {
      const target = path.join(tmp, 'my-app');
      await runCli(['--no-install', 'create', 'my-app', 'default'], tmp);
      const userFile = path.join(target, 'user-file.txt');
      fs.writeFileSync(userFile, 'keep me');
      const res = await runCli(['--no-install', 'add', 'database-d1'], target);
      expect(res.exitCode).toBe(0);
      expect(fs.existsSync(userFile)).toBe(true);
      expect(fs.readFileSync(userFile, 'utf-8')).toBe('keep me');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('keeps unrelated files when add is repeated', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-compose-repeat-unrelated-'));
    try {
      const target = path.join(tmp, 'my-app');
      await runCli(['--no-install', 'create', 'my-app', 'default'], tmp);
      fs.writeFileSync(path.join(target, 'unrelated.txt'), 'untouched');
      await runCli(['--no-install', 'add', 'auth'], target);
      await runCli(['--no-install', 'add', 'auth'], target);
      expect(fs.readFileSync(path.join(target, 'unrelated.txt'), 'utf-8')).toBe('untouched');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
