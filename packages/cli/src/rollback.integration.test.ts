import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { runCli, parseEnvelope } from './integration-helpers.js';

interface FileSnapshot {
  files: string[];
  checksums: Record<string, string>;
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function snapshotDirectory(dir: string, root: string): FileSnapshot {
  const result: FileSnapshot = { files: [], checksums: {} };
  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const relative = path.relative(root, full).replace(/\\/g, '/');
        result.files.push(relative);
        result.checksums[relative] = sha256(full);
      }
    }
  }
  walk(dir);
  result.files.sort();
  return result;
}

function createFailingRegistry(baseDir: string): string {
  const registryPath = path.join(baseDir, 'registry');
  const starterDir = path.join(registryPath, 'starters', 'failing');
  const templateDir = path.join(starterDir, 'template');

  fs.mkdirSync(templateDir, { recursive: true });

  const manifest = {
    id: 'failing',
    schemaVersion: 1,
    version: '0.1.0',
    displayName: 'Failing Verification Starter',
    description: 'A starter used only for integration tests that fails verification.',
    compatibility: { engine: '>=0.1.0', node: '>=22' },
    templateDir: 'template',
    files: [],
    templateOperations: [],
    verificationCommands: ['node fail-verification.js'],
    generatedOwnership: {
      factoryGenerated: ['package.json'],
      features: [],
      extensions: [],
    },
  };

  // Registry loader looks for top-level JSON manifests under starters/ and modules/.
  fs.writeFileSync(path.join(registryPath, 'starters', 'failing.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(
    path.join(templateDir, 'package.json'),
    JSON.stringify({ name: 'failing-starter', version: '0.0.1', private: true }, null, 2) + '\n'
  );
  fs.writeFileSync(path.join(templateDir, 'fail-verification.js'), 'process.exit(1);\n');
  fs.writeFileSync(path.join(templateDir, 'README.md'), '# failing starter\n');

  return registryPath;
}

function createFailingAddModuleRegistry(baseDir: string): string {
  // Start with the minimal starter registry, then add a failing module.
  const registryPath = createMinimalRegistry(baseDir);
  const moduleDir = path.join(registryPath, 'modules', 'failing-verify');
  const templateDir = path.join(moduleDir, 'template');
  fs.mkdirSync(templateDir, { recursive: true });

  const moduleManifest = {
    id: 'failing-verify',
    schemaVersion: 1,
    version: '0.1.0',
    engine: '>=0.1.0',
    displayName: 'Failing Verification Module',
    description: 'A module that fails its verification command.',
    compatibility: { engine: '>=0.1.0', node: '>=22' },
    templateDir: 'template',
    starters: [],
    requires: [],
    conflicts: [],
    capabilities: [],
    generatedContributions: [],
    documentation: 'docs/failing-verify.md',
    files: ['verify-fail.js'],
    packages: [],
    devPackages: [],
    environment: [],
    migrations: [],
    verification: ['node verify-fail.js'],
    routeContributions: [],
    webRouteContributions: [],
  };

  fs.writeFileSync(
    path.join(registryPath, 'modules', 'failing-verify.json'),
    JSON.stringify(moduleManifest, null, 2) + '\n'
  );
  fs.writeFileSync(path.join(templateDir, 'verify-fail.js'), 'process.exit(1);\n');

  return registryPath;
}

function createMinimalRegistry(baseDir: string): string {
  const registryPath = path.join(baseDir, 'registry');
  const starterDir = path.join(registryPath, 'starters', 'minimal');
  const templateDir = path.join(starterDir, 'template');
  fs.mkdirSync(templateDir, { recursive: true });

  const manifest = {
    id: 'minimal',
    schemaVersion: 1,
    version: '0.1.0',
    displayName: 'Minimal Starter',
    description: 'A tiny starter for rollback tests.',
    compatibility: { engine: '>=0.1.0', node: '>=22' },
    templateDir: 'template',
    files: [],
    templateOperations: [
      { source: 'package.json', target: 'package.json', kind: 'copy' },
      { source: 'a.txt', target: 'a.txt', kind: 'copy' },
      { source: 'b.txt', target: 'b.txt', kind: 'copy' },
    ],
    verificationCommands: [],
    generatedOwnership: {
      factoryGenerated: ['package.json', 'a.txt', 'b.txt'],
      features: [],
      extensions: [],
    },
  };

  fs.writeFileSync(path.join(registryPath, 'starters', 'minimal.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(templateDir, 'package.json'), JSON.stringify({ name: 'minimal' }, null, 2) + '\n');
  fs.writeFileSync(path.join(templateDir, 'a.txt'), 'a\n');
  fs.writeFileSync(path.join(templateDir, 'b.txt'), 'b\n');

  return registryPath;
}

describe('projectforge create rollback behavior', () => {
  it('returns exit code 3 when verification fails and rollback succeeds', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-verify-fail-'));
    try {
      const registryPath = createFailingRegistry(tmp);
      const target = path.join(tmp, 'my-app');
      const { exitCode, stdout } = await runCli(['--json', 'create', 'my-app', 'failing'], tmp, {
        PROJECTFORGE_REGISTRY: registryPath,
      });
      expect(exitCode).toBe(3);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_VERIFICATION_FAILED');
      // Project root should be cleaned up after rollback.
      expect(fs.existsSync(target)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rolls back after a package.json write failure', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-manifest-fail-'));
    try {
      const registryPath = createMinimalRegistry(tmp);
      const target = path.join(tmp, 'my-app');
      const { exitCode, stdout } = await runCli(['--no-install', '--json', 'create', 'my-app', 'minimal'], tmp, {
        PROJECTFORGE_REGISTRY: registryPath,
        PF_FAILURE_AFTER_MANIFEST: '1',
      });
      expect(exitCode).toBe(1);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_EXECUTION_FAILED');
      expect(fs.existsSync(target)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('returns exit code 4 when rollback fails after verification error', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-rollback-fail-'));
    try {
      const registryPath = createFailingRegistry(tmp);
      const target = path.join(tmp, 'my-app');
      const { exitCode, stdout } = await runCli(['--json', 'create', 'my-app', 'failing'], tmp, {
        PROJECTFORGE_REGISTRY: registryPath,
        PF_FAILURE_INJECT_ROLLBACK: '1',
      });
      expect(exitCode).toBe(4);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_ROLLBACK_FAILED');
      // Recovery report should be preserved.
      expect(fs.existsSync(target)).toBe(true);
      const reportPath = envelope.errors[0].details?.recoveryReportPath;
      expect(typeof reportPath).toBe('string');
      expect(fs.existsSync(reportPath)).toBe(true);
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      expect(report.rollbackErrors.length).toBeGreaterThan(0);
      expect(report.appliedFiles).toContain('package.json');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rolls back after a mid-transaction file write failure', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-mid-write-fail-'));
    try {
      const registryPath = createMinimalRegistry(tmp);
      const target = path.join(tmp, 'my-app');
      const { exitCode, stdout } = await runCli(['--no-install', '--json', 'create', 'my-app', 'minimal'], tmp, {
        PROJECTFORGE_REGISTRY: registryPath,
        PF_FAILURE_AFTER_N_WRITES: '1',
      });
      expect(exitCode).toBe(1);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_EXECUTION_FAILED');
      // Created files should be rolled back.
      expect(fs.existsSync(target)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('restores the original project state after rollback', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-snapshot-rollback-'));
    try {
      const registryPath = createMinimalRegistry(tmp);
      const target = path.join(tmp, 'my-app');
      // First create succeeds.
      const createRes = await runCli(['--no-install', 'create', 'my-app', 'minimal'], tmp, {
        PROJECTFORGE_REGISTRY: registryPath,
      });
      expect(createRes.exitCode).toBe(0);
      const before = snapshotDirectory(target, target);

      // Inject a failure during add, which writes new files, then rolls back.
      const addRes = await runCli(['--no-install', '--json', 'add', 'database-d1'], target, {
        PF_FAILURE_AFTER_N_WRITES: '1',
      });
      expect(addRes.exitCode).toBe(1);
      const after = snapshotDirectory(target, target);
      expect(after.files).toEqual(before.files);
      for (const file of after.files) {
        expect(after.checksums[file]).toBe(before.checksums[file]);
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('preserves unrelated files during rollback', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-unrelated-rollback-'));
    try {
      const registryPath = createMinimalRegistry(tmp);
      const target = path.join(tmp, 'my-app');
      const createRes = await runCli(['--no-install', 'create', 'my-app', 'minimal'], tmp, {
        PROJECTFORGE_REGISTRY: registryPath,
      });
      expect(createRes.exitCode).toBe(0);
      fs.writeFileSync(path.join(target, 'user-keep.txt'), 'keep');
      const addRes = await runCli(['--no-install', '--json', 'add', 'database-d1'], target, {
        PF_FAILURE_AFTER_N_WRITES: '1',
      });
      expect(addRes.exitCode).toBe(1);
      expect(fs.existsSync(path.join(target, 'user-keep.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(target, 'user-keep.txt'), 'utf-8')).toBe('keep');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  // Only `create` emits an `install` package operation, so this test must use
  // `create`. On failure `create` removes the project root, so we cannot also
  // test preservation of an unrelated user file here; that is covered by the
  // verification-failure test below.
  it('rolls back after a real package install failure', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-install-fail-'));
    try {
      const registryPath = createMinimalRegistry(tmp);
      const target = path.join(tmp, 'my-app');
      const { exitCode, stdout } = await runCli(['--json', 'create', 'my-app', 'minimal'], tmp, {
        PROJECTFORGE_REGISTRY: registryPath,
        PF_FAILURE_AFTER_INSTALL: '1',
      });
      expect(exitCode).toBe(1);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_EXECUTION_FAILED');
      expect(envelope.errors[0].details?.injectedAt).toBe('install');
      // Project root should be removed after successful rollback.
      expect(fs.existsSync(target)).toBe(false);
      // No transaction lock should remain.
      expect(fs.existsSync(path.join(target, '.projectforge', 'transaction.lock'))).toBe(false);
      // JSON output should not leak package-manager secrets.
      const output = stdout.toLowerCase();
      expect(output).not.toContain('bearer ');
      expect(output).not.toContain('auth=');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }, 60000);

  it('returns exit code 3 when add verification fails and rolls back state', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-add-verify-fail-'));
    try {
      const registryPath = createFailingAddModuleRegistry(tmp);
      const target = path.join(tmp, 'my-app');
      const createRes = await runCli(['--no-install', 'create', 'my-app', 'minimal'], tmp, {
        PROJECTFORGE_REGISTRY: registryPath,
      });
      expect(createRes.exitCode).toBe(0);
      // Add a user file that should survive the rollback.
      fs.writeFileSync(path.join(target, 'user-keep.txt'), 'keep');
      const before = snapshotDirectory(target, target);

      const { exitCode, stdout } = await runCli(['--json', 'add', 'failing-verify'], target, {
        PROJECTFORGE_REGISTRY: registryPath,
      });
      expect(exitCode).toBe(3);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_VERIFICATION_FAILED');

      const after = snapshotDirectory(target, target);
      expect(after.files).toEqual(before.files);
      for (const file of after.files) {
        expect(after.checksums[file]).toBe(before.checksums[file]);
      }
      // Unrelated user file should be preserved.
      expect(fs.existsSync(path.join(target, 'user-keep.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(target, 'user-keep.txt'), 'utf-8')).toBe('keep');
      // Transaction lock should be cleaned up.
      expect(fs.existsSync(path.join(target, '.projectforge', 'transaction.lock'))).toBe(false);
      // JSON output should not contain secrets.
      const output = stdout.toLowerCase();
      expect(output).not.toContain('bearer ');
      expect(output).not.toContain('auth=');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('removes backup artifacts after a successful rollback', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-backup-cleanup-'));
    try {
      const registryPath = createMinimalRegistry(tmp);
      const target = path.join(tmp, 'my-app');
      const createRes = await runCli(['--no-install', 'create', 'my-app', 'minimal'], tmp, {
        PROJECTFORGE_REGISTRY: registryPath,
      });
      expect(createRes.exitCode).toBe(0);

      // Trigger a mid-transaction write failure that overwrites an existing file.
      const addRes = await runCli(['--no-install', '--json', 'add', 'database-d1'], target, {
        PF_FAILURE_AFTER_N_WRITES: '1',
      });
      expect(addRes.exitCode).toBe(1);

      // No .backup-* files should remain after successful rollback.
      function hasBackupFiles(dir: string): boolean {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (hasBackupFiles(full)) return true;
          } else if (entry.name.includes('.backup-')) {
            return true;
          }
        }
        return false;
      }
      expect(hasBackupFiles(target)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
