import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCli, parseEnvelope } from './integration-helpers.js';

describe('projectforge provenance and integrity', () => {
  it('persists provenance in projectforge-lock.json after create', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-provenance-create-'));
    try {
      const target = path.join(tmp, 'my-app');
      const res = await runCli(['--no-install', 'create', 'my-app', 'default'], tmp);
      expect(res.exitCode).toBe(0);
      const lockRaw = fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8');
      const lock = JSON.parse(lockRaw);
      expect(lock.provenance).toBeDefined();
      expect(typeof lock.provenance).toBe('object');
      // projectforge.json and projectforge-lock.json should be recorded as factory-generated.
      expect(lock.provenance['projectforge.json']).toBeDefined();
      expect(lock.provenance['projectforge.json'].ownership).toBe('factory-generated');
      expect(lock.provenance['projectforge-lock.json']).toBeDefined();
      expect(lock.provenance['projectforge-lock.json'].ownership).toBe('factory-generated');
      // Checksums should be deterministic SHA256 hex strings.
      for (const entry of Object.values(lock.provenance) as Array<{ sha256: string }>) {
        expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects add when a managed file has been modified', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-provenance-modified-'));
    try {
      const target = path.join(tmp, 'my-app');
      const createRes = await runCli(['--no-install', 'create', 'my-app', 'default'], tmp);
      expect(createRes.exitCode).toBe(0);

      // First add writes files and records provenance.
      const firstAdd = await runCli(['--no-install', 'add', 'database-d1'], target);
      expect(firstAdd.exitCode).toBe(0);

      // Modify a file that the module owns so the next add will write it again.
      const dbFeaturePath = path.join(target, 'apps/api/src/features/database/index.ts');
      fs.writeFileSync(dbFeaturePath, '// tampered');

      const before = fs.readFileSync(dbFeaturePath, 'utf-8');
      const res = await runCli(['--no-install', '--json', 'add', 'database-d1'], target);
      expect(res.exitCode).toBe(1);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_USER_MODIFIED_MANAGED_FILE');

      // File should remain untouched.
      expect(fs.readFileSync(dbFeaturePath, 'utf-8')).toBe(before);
      // Transaction lock should be cleaned up.
      expect(fs.existsSync(path.join(target, '.projectforge', 'transaction.lock'))).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('dry-run reports integrity conflict without side effects', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-provenance-dryrun-'));
    try {
      const target = path.join(tmp, 'my-app');
      const createRes = await runCli(['--no-install', 'create', 'my-app', 'default'], tmp);
      expect(createRes.exitCode).toBe(0);
      const firstAdd = await runCli(['--no-install', 'add', 'database-d1'], target);
      expect(firstAdd.exitCode).toBe(0);

      const dbFeaturePath = path.join(target, 'apps/api/src/features/database/index.ts');
      fs.writeFileSync(dbFeaturePath, '// tampered');
      const lockBefore = fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8');

      const before = fs.readFileSync(dbFeaturePath, 'utf-8');
      const res = await runCli(['--no-install', '--json', '--dry-run', 'add', 'database-d1'], target);
      expect(res.exitCode).toBe(1);
      const envelope = parseEnvelope(res.stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_USER_MODIFIED_MANAGED_FILE');
      expect(fs.readFileSync(dbFeaturePath, 'utf-8')).toBe(before);

      // No lock, backup, or transaction artifacts should be written during a dry run.
      expect(fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8')).toBe(lockBefore);
      expect(fs.existsSync(path.join(target, '.projectforge', 'transaction.lock'))).toBe(false);
      const backupFiles = fs.readdirSync(target, { recursive: true }).filter((p) => String(p).includes('.backup-'));
      expect(backupFiles.length).toBe(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('repeated add does not change deterministic provenance', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-provenance-repeat-'));
    try {
      const target = path.join(tmp, 'my-app');
      await runCli(['--no-install', 'create', 'my-app', 'default'], tmp);
      await runCli(['--no-install', 'add', 'database-d1'], target);
      const firstLock = JSON.parse(fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8'));
      await runCli(['--no-install', 'add', 'database-d1'], target);
      const secondLock = JSON.parse(fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8'));
      expect(secondLock.provenance).toEqual(firstLock.provenance);
      expect(secondLock.generatedChecksums).toEqual(firstLock.generatedChecksums);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
