import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCli, parseEnvelope } from './integration-helpers.js';

describe('comments product shell', { timeout: 30000 }, () => {
  it('adds comments with transitive auth and database-d1', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-comments-'));
    try {
      const createRes = await runCli(['--no-install', 'create', 'my-app', 'default'], tmp);
      expect(createRes.exitCode).toBe(0);

      const target = path.join(tmp, 'my-app');
      const addRes = await runCli(['--no-install', '--json', 'add', 'comments'], target);
      expect(addRes.exitCode).toBe(0);

      const envelope = parseEnvelope(addRes.stdout);
      expect(envelope.ok).toBe(true);

      // Verify project config records all resolved modules.
      const config = JSON.parse(fs.readFileSync(path.join(target, 'projectforge.json'), 'utf-8'));
      expect(config.modules).toContain('comments');
      expect(config.modules).toContain('auth');
      expect(config.modules).toContain('database-d1');

      // Verify generated web route registry.
      const featuresPath = path.join(target, 'apps/web/src/features/index.tsx');
      expect(fs.existsSync(featuresPath)).toBe(true);
      const featuresContent = fs.readFileSync(featuresPath, 'utf-8');
      expect(featuresContent).toContain("import Comments from './comments/index';");
      expect(featuresContent).toContain("{ path: '/comments', element: <Comments /> }");

      // Verify API route registry.
      const apiFeaturesPath = path.join(target, 'apps/api/src/features/index.ts');
      const apiFeaturesContent = fs.readFileSync(apiFeaturesPath, 'utf-8');
      expect(apiFeaturesContent).toContain("{ path: '/api/comments', router: comments },");

      // Verify comments component and tests are copied.
      expect(fs.existsSync(path.join(target, 'apps/web/src/features/comments/index.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'apps/web/src/features/comments/index.test.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'apps/api/src/features/comments/index.ts'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'apps/api/src/features/comments/index.test.ts'))).toBe(true);

      // Verify migration is copied.
      expect(fs.existsSync(path.join(target, 'migrations/0002_comments_init.sql'))).toBe(true);

      // Verify lock provenance records the generated files.
      const lock = JSON.parse(fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8'));
      expect(lock.provenance['apps/web/src/features/index.tsx']).toBeDefined();
      expect(lock.provenance['apps/web/src/features/comments/index.tsx']).toBeDefined();
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('repeated add is deterministic and no-op', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-comments-repeat-'));
    try {
      await runCli(['--no-install', 'create', 'my-app', 'default'], tmp);
      const target = path.join(tmp, 'my-app');
      await runCli(['--no-install', 'add', 'comments'], target);

      const before = JSON.parse(fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8'));
      const addRes = await runCli(['--no-install', '--json', 'add', 'comments'], target);
      expect(addRes.exitCode).toBe(0);
      const after = JSON.parse(fs.readFileSync(path.join(target, 'projectforge-lock.json'), 'utf-8'));
      // Deterministic no-op: modules, checksums, and provenance remain unchanged.
      expect(after.modules).toEqual(before.modules);
      expect(after.generatedChecksums).toEqual(before.generatedChecksums);
      expect(after.provenance).toEqual(before.provenance);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
