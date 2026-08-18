import { describe, it, expect } from 'vitest';
import { TransactionExecutor } from './executor.js';
import { hashString } from './checksum.js';
import type { FileSystemAdapter, ProcessAdapter } from './interfaces.js';
import type { Plan, FileOperation } from './planner.js';
import type { PackageManagerAdapter } from './package-manager.js';

function makeFileMap(): Map<string, Uint8Array> {
  return new Map();
}

function makeFs(
  map: Map<string, Uint8Array>,
  failOnWrite?: string[],
  failOnRm?: string[]
): FileSystemAdapter {
  return {
    readFile: async (p) => {
      if (!map.has(p)) throw new Error(`file not found: ${p}`);
      return map.get(p)!;
    },
    writeFile: async (p, content) => {
      if (failOnWrite?.includes(p)) throw new Error(`injected write failure: ${p}`);
      map.set(p, content);
    },
    exists: async (p) => map.has(p),
    mkdir: async () => {},
    rm: async (p) => {
      if (failOnRm?.includes(p)) throw new Error(`injected rm failure: ${p}`);
      map.delete(p);
    },
  };
}

function makePm(options: { failAdd?: string } = {}): PackageManagerAdapter {
  // Track target manifests passed to add/addDev/remove for assertions.
  const targetLog: string[] = [];
  return {
    name: 'pnpm',
    add: async (packages, _cwd, targetManifest) => {
      if (targetManifest) targetLog.push(`add:${targetManifest}`);
      if (options.failAdd && packages.includes(options.failAdd)) {
        return { exitCode: 1, stdout: '', stderr: `failed to add ${options.failAdd}` };
      }
      return { exitCode: 0, stdout: '', stderr: '' };
    },
    addDev: async (packages, _cwd, targetManifest) => {
      if (targetManifest) targetLog.push(`addDev:${targetManifest}`);
      if (options.failAdd && packages.includes(options.failAdd)) {
        return { exitCode: 1, stdout: '', stderr: `failed to add dev ${options.failAdd}` };
      }
      return { exitCode: 0, stdout: '', stderr: '' };
    },
    remove: async (_packages, _cwd, targetManifest) => {
      if (targetManifest) targetLog.push(`remove:${targetManifest}`);
      return { exitCode: 0, stdout: '', stderr: '' };
    },
    install: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    _targetLog: targetLog,
  } as PackageManagerAdapter & { _targetLog: string[] };
}

const processAdapter: ProcessAdapter = {
  exec: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
};

function makePlan(fileOps: FileOperation[], packages: string[] = []): Plan {
  return {
    planId: 'plan-test',
    requestedModules: [],
    dependencyOrder: [],
    fileOperations: fileOps,
    packageOperations: packages.map((name) => ({ kind: 'add' as const, name, targetManifest: 'apps/api/package.json' })),
    envKeys: [],
    migrations: [],
    verificationCommands: [],
    warnings: [],
  };
}

describe('TransactionExecutor', () => {
  it('applies file operations', async () => {
    const map = makeFileMap();
    const fs = makeFs(map);
    const plan = makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'hello' }]);
    const executor = new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    });

    const result = await executor.execute();
    expect(result.success).toBe(true);
    expect(result.appliedFiles).toContain('src/index.ts');
    expect(map.has('/project/src/index.ts')).toBe(true);
  });

  it('backs up existing files before overwriting', async () => {
    const map = makeFileMap();
    map.set('/project/src/index.ts', new TextEncoder().encode('original'));
    const fs = makeFs(map);
    const plan = makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'updated' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(true);
    const content = new TextDecoder().decode(map.get('/project/src/index.ts')!);
    expect(content).toBe('updated');
    expect(result.backups.size).toBe(1);
  });

  it('rolls back newly created files on failure', async () => {
    const map = makeFileMap();
    const fs = makeFs(map, ['/project/src/index.ts']);
    const plan = makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'hello' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(false);
    expect(map.has('/project/src/index.ts')).toBe(false);
  });

  it('rolls back installed packages on failure', async () => {
    const map = makeFileMap();
    const fs = makeFs(map);
    const plan = makePlan([{ kind: 'copy', targetPath: 'file.ts', content: 'x' }], ['pkg-a']);
    const pm = makePm({ failAdd: 'pkg-a' });
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: pm,
    }).execute();

    expect(result.success).toBe(false);
    expect(result.installedPackages).toEqual([]);
  });

  it('fails on verification command failure', async () => {
    const map = makeFileMap();
    const fs = makeFs(map);
    const plan: Plan = {
      ...makePlan([]),
      verificationCommands: ['false'],
    };
    const failingProcess: ProcessAdapter = {
      exec: async (command) => ({ exitCode: 1, stdout: '', stderr: `command failed: ${command}` }),
    };
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: failingProcess,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PF_VERIFICATION_FAILED');
  });

  it('reports rollback failure when cleanup cannot complete', async () => {
    const map = makeFileMap();
    const fs = makeFs(map, [], ['/project/file.ts']);
    const plan: Plan = {
      ...makePlan([{ kind: 'copy', targetPath: 'file.ts', content: 'x' }]),
      verificationCommands: ['false'],
    };
    const failingProcess: ProcessAdapter = {
      exec: async (command) => ({ exitCode: 1, stdout: '', stderr: `command failed: ${command}` }),
    };
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: failingProcess,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PF_ROLLBACK_FAILED');
  });

  it('produces predictable backup paths for overwritten files', async () => {
    const map = makeFileMap();
    map.set('/project/src/index.ts', new TextEncoder().encode('original'));
    const fs = makeFs(map);
    const plan = makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'updated' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(true);
    expect(result.backups.size).toBe(1);
    const [[original, backup]] = result.backups.entries();
    expect(original).toBe('/project/src/index.ts');
    expect(backup).toMatch(/src\/index\.backup-\d+\.ts$/);
  });

  it('produces predictable backup paths for dotfiles', async () => {
    const map = makeFileMap();
    map.set('/project/.gitignore', new TextEncoder().encode('node_modules'));
    const fs = makeFs(map);
    const plan = makePlan([{ kind: 'copy', targetPath: '.gitignore', content: 'dist' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(true);
    expect(result.backups.size).toBe(1);
    const [[original, backup]] = result.backups.entries();
    expect(original).toBe('/project/.gitignore');
    expect(backup).toMatch(/\.gitignore\.backup-\d+$/);
  });

  it('produces predictable backup paths when the directory contains a dot', async () => {
    const map = makeFileMap();
    map.set('/project/src/v1.0/index.ts', new TextEncoder().encode('original'));
    const fs = makeFs(map);
    const plan = makePlan([{ kind: 'copy', targetPath: 'src/v1.0/index.ts', content: 'updated' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(true);
    expect(result.backups.size).toBe(1);
    const [[original, backup]] = result.backups.entries();
    expect(original).toBe('/project/src/v1.0/index.ts');
    expect(backup).toMatch(/v1\.0\/index\.backup-\d+\.ts$/);
  });

  it('produces predictable backup paths for hidden files with an extension', async () => {
    const map = makeFileMap();
    map.set('/project/.eslintrc.json', new TextEncoder().encode('{}'));
    const fs = makeFs(map);
    const plan = makePlan([{ kind: 'copy', targetPath: '.eslintrc.json', content: '{"root": true}' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(true);
    expect(result.backups.size).toBe(1);
    const [[original, backup]] = result.backups.entries();
    expect(original).toBe('/project/.eslintrc.json');
    expect(backup).toMatch(/\.eslintrc\.backup-\d+\.json$/);
  });

  it('restores original content of overwritten files on rollback', async () => {
    const map = makeFileMap();
    map.set('/project/src/index.ts', new TextEncoder().encode('original'));
    const fs = makeFs(map);
    const plan: Plan = {
      ...makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'updated' }]),
      verificationCommands: ['false'],
    };
    const failingProcess: ProcessAdapter = {
      exec: async (command) => ({ exitCode: 1, stdout: '', stderr: `command failed: ${command}` }),
    };
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: failingProcess,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(false);
    const content = new TextDecoder().decode(map.get('/project/src/index.ts')!);
    expect(content).toBe('original');
  });

  it('computes stable SHA256 checksums for generated files', async () => {
    const map = makeFileMap();
    const fs = makeFs(map);
    const content = 'export const answer = 42;';
    const plan = makePlan([{ kind: 'copy', targetPath: 'src/answer.ts', content }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(true);
    const expectedHash = (await import('./checksum.js')).hashString(content);
    expect(result.checksums['src/answer.ts']).toBe(expectedHash);
  });

  it('produces the same checksum for identical content and a different checksum for modified content', async () => {
    const originalContent = 'export const answer = 42;';
    const originalChecksum = hashString(originalContent);
    const modifiedChecksum = hashString('export const answer = 43;');

    expect(originalChecksum).toBe(hashString(originalContent));
    expect(modifiedChecksum).not.toBe(originalChecksum);

    const map = makeFileMap();
    const fs = makeFs(map);
    const plan = makePlan([{ kind: 'copy', targetPath: 'src/answer.ts', content: originalContent }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(true);
    expect(result.checksums['src/answer.ts']).toBe(originalChecksum);
  });

  it('fails when removing a non-existent file', async () => {
    const map = makeFileMap();
    const fs = makeFs(map);
    const plan = makePlan([{ kind: 'remove', targetPath: 'src/missing.ts' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('cannot remove missing file');
  });

  it('restores removed files on rollback', async () => {
    const map = makeFileMap();
    map.set('/project/src/legacy.ts', new TextEncoder().encode('legacy'));
    const fs = makeFs(map);
    const plan: Plan = {
      ...makePlan([{ kind: 'remove', targetPath: 'src/legacy.ts' }]),
      verificationCommands: ['false'],
    };
    const failingProcess: ProcessAdapter = {
      exec: async (command) => ({ exitCode: 1, stdout: '', stderr: `command failed: ${command}` }),
    };
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: failingProcess,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(false);
    expect(map.has('/project/src/legacy.ts')).toBe(true);
    const content = new TextDecoder().decode(map.get('/project/src/legacy.ts')!);
    expect(content).toBe('legacy');
  });

  it('records provenance for applied files', async () => {
    const map = makeFileMap();
    const fs = makeFs(map);
    const plan = makePlan([{
      kind: 'copy',
      targetPath: 'src/index.ts',
      content: 'hello',
      provenance: {
        ownerId: 'module-a',
        ownerVersion: '0.1.0',
        operation: 'copy',
        classification: 'managed',
        ownership: 'module-managed',
      },
    }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(true);
    expect(result.provenance['src/index.ts']).toBeDefined();
    expect(result.provenance['src/index.ts'].ownership).toBe('module-managed');
    expect(result.provenance['src/index.ts'].ownerId).toBe('module-a');
    expect(result.provenance['src/index.ts'].sha256).toBe(result.checksums['src/index.ts']);
  });

  it('rejects a user-modified managed file before any write', async () => {
    const map = makeFileMap();
    map.set('/project/src/index.ts', new TextEncoder().encode('user-modified'));
    const fs = makeFs(map);
    // Lock records the original checksum and ownership.
    const lock = {
      schemaVersion: 1,
      engineVersion: '0.1.0',
      starter: { id: 'minimal', version: '0.1.0', checksum: 'starter-checksum' },
      modules: [],
      generatedChecksums: {},
      provenance: {
        'src/index.ts': {
          path: 'src/index.ts',
          sha256: (await import('./checksum.js')).hashString('original'),
          ownership: 'module-managed',
          ownerId: 'module-a',
          ownerVersion: '0.1.0',
          operation: 'copy',
          classification: 'managed',
          schemaVersion: 1,
        },
      },
      timestamp: new Date().toISOString(),
    };
    map.set('/project/projectforge-lock.json', new TextEncoder().encode(JSON.stringify(lock, null, 2)));

    const plan = makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'updated' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PF_USER_MODIFIED_MANAGED_FILE');
    expect(result.errors[0]).toContain('managed file has been modified by user');
  });

  it('allows user-owned files to be modified without failing integrity check', async () => {
    const map = makeFileMap();
    map.set('/project/src/index.ts', new TextEncoder().encode('user-changed'));
    const fs = makeFs(map);
    const lock = {
      schemaVersion: 1,
      engineVersion: '0.1.0',
      starter: { id: 'minimal', version: '0.1.0', checksum: 'starter-checksum' },
      modules: [],
      generatedChecksums: {},
      provenance: {
        'src/index.ts': {
          path: 'src/index.ts',
          sha256: (await import('./checksum.js')).hashString('original'),
          ownership: 'user-owned',
          ownerId: 'user',
          ownerVersion: '0.0.0',
          operation: 'write',
          classification: 'user',
          schemaVersion: 1,
        },
      },
      timestamp: new Date().toISOString(),
    };
    map.set('/project/projectforge-lock.json', new TextEncoder().encode(JSON.stringify(lock, null, 2)));

    const plan = makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'updated' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(true);
    expect(result.appliedFiles).toContain('src/index.ts');
  });

  it('falls back to legacy generatedChecksums when provenance is missing', async () => {
    const map = makeFileMap();
    map.set('/project/src/index.ts', new TextEncoder().encode('original'));
    const fs = makeFs(map);
    const lock = {
      schemaVersion: 1,
      engineVersion: '0.1.0',
      starter: { id: 'minimal', version: '0.1.0', checksum: 'starter-checksum' },
      modules: [],
      generatedChecksums: {
        'src/index.ts': (await import('./checksum.js')).hashString('original'),
      },
      provenance: {},
      timestamp: new Date().toISOString(),
    };
    map.set('/project/projectforge-lock.json', new TextEncoder().encode(JSON.stringify(lock, null, 2)));

    const plan = makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'updated' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(true);
  });

  it('falls back to legacy locks that have no provenance field at all', async () => {
    const map = makeFileMap();
    map.set('/project/src/index.ts', new TextEncoder().encode('original'));
    const fs = makeFs(map);
    const lock = {
      schemaVersion: 1,
      engineVersion: '0.1.0',
      starter: { id: 'minimal', version: '0.1.0', checksum: 'starter-checksum' },
      modules: [],
      generatedChecksums: {
        'src/index.ts': (await import('./checksum.js')).hashString('original'),
      },
      timestamp: new Date().toISOString(),
    };
    map.set('/project/projectforge-lock.json', new TextEncoder().encode(JSON.stringify(lock, null, 2)));

    const plan = makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'updated' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(true);
  });

  it('detects stale checksum in legacy generatedChecksums', async () => {
    const map = makeFileMap();
    map.set('/project/src/index.ts', new TextEncoder().encode('user-modified'));
    const fs = makeFs(map);
    const lock = {
      schemaVersion: 1,
      engineVersion: '0.1.0',
      starter: { id: 'minimal', version: '0.1.0', checksum: 'starter-checksum' },
      modules: [],
      generatedChecksums: {
        'src/index.ts': (await import('./checksum.js')).hashString('original'),
      },
      provenance: {},
      timestamp: new Date().toISOString(),
    };
    map.set('/project/projectforge-lock.json', new TextEncoder().encode(JSON.stringify(lock, null, 2)));

    const plan = makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'updated' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PF_USER_MODIFIED_MANAGED_FILE');
  });

  it('performs dry-run integrity check without side effects', async () => {
    const map = makeFileMap();
    map.set('/project/src/index.ts', new TextEncoder().encode('user-modified'));
    const fs = makeFs(map);
    const lock = {
      schemaVersion: 1,
      engineVersion: '0.1.0',
      starter: { id: 'minimal', version: '0.1.0', checksum: 'starter-checksum' },
      modules: [],
      generatedChecksums: {},
      provenance: {
        'src/index.ts': {
          path: 'src/index.ts',
          sha256: (await import('./checksum.js')).hashString('original'),
          ownership: 'module-managed',
          ownerId: 'module-a',
          ownerVersion: '0.1.0',
          operation: 'copy',
          classification: 'managed',
          schemaVersion: 1,
        },
      },
      timestamp: new Date().toISOString(),
    };
    map.set('/project/projectforge-lock.json', new TextEncoder().encode(JSON.stringify(lock, null, 2)));

    const plan = makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'updated' }]);
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: processAdapter,
      packageManager: makePm(),
      dryRun: true,
    }).execute();

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PF_USER_MODIFIED_MANAGED_FILE');
    // No writes occurred.
    expect(new TextDecoder().decode(map.get('/project/src/index.ts')!)).toBe('user-modified');
  });

  it('redacts secrets from the recovery report after rollback failure', async () => {
    const map = makeFileMap();
    const fs = makeFs(map, [], []);
    const secret = 'super-secret-recovery-value';
    const fsWithFailingRm: FileSystemAdapter = {
      ...fs,
      rm: async (p) => {
        // Use an auth-secret pattern to prove the redactor covers real credential classes.
        throw new Error(`BETTER_AUTH_SECRET=${secret} for ${p}`);
      },
    };
    const plan: Plan = {
      ...makePlan([{ kind: 'copy', targetPath: 'src/index.ts', content: 'hello' }]),
      verificationCommands: ['false'],
    };
    const failingProcess: ProcessAdapter = {
      exec: async (command) => ({ exitCode: 1, stdout: '', stderr: `command failed: ${command}` }),
    };
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs: fsWithFailingRm,
      process: failingProcess,
      packageManager: makePm(),
    }).execute();

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PF_ROLLBACK_FAILED');
    expect(result.recoveryReportPath).toBeDefined();

    const reportBytes = map.get(result.recoveryReportPath!);
    expect(reportBytes).toBeDefined();
    const report = JSON.parse(new TextDecoder().decode(reportBytes!));
    expect(report.schemaVersion).toBe(1);
    expect(report.projectRoot).toBe('/project');
    expect(report.originalError).toBeDefined();
    expect(report.rollbackErrors).toEqual(expect.any(Array));
    const reportText = JSON.stringify(report);
    expect(reportText).not.toContain(secret);
    expect(reportText).toContain('[REDACTED]');
  });

  it('preserves package operation targetManifest during rollback', async () => {
    const map = makeFileMap();
    // Set up manifests for a non-default target: packages/example/package.json
    map.set('/project/package.json', new TextEncoder().encode(JSON.stringify({ name: 'root', dependencies: {} })));
    map.set('/project/apps/api/package.json', new TextEncoder().encode(JSON.stringify({ name: '@app/api', dependencies: {} })));
    map.set('/project/packages/example/package.json', new TextEncoder().encode(JSON.stringify({ name: '@app/example', dependencies: {} })));
    const fs = makeFs(map);

    // Build a plan with a non-API target and a verification command that fails.
    const plan: Plan = {
      planId: 'plan-target-test',
      requestedModules: [],
      dependencyOrder: [],
      fileOperations: [],
      packageOperations: [
        { kind: 'add' as const, name: 'target-pkg', targetManifest: 'packages/example/package.json' },
      ],
      envKeys: [],
      migrations: [],
      verificationCommands: ['false'],
      warnings: [],
    };
    const failingProcess: ProcessAdapter = {
      exec: async (command) => ({ exitCode: 1, stdout: '', stderr: `command failed: ${command}` }),
    };
    const pm = makePm();
    const result = await new TransactionExecutor({
      plan,
      projectRoot: '/project',
      fs,
      process: failingProcess,
      packageManager: pm,
    }).execute();

    expect(result.success).toBe(false);
    // Rollback should have called remove with the SAME targetManifest used by add.
    const targetLog = (pm as unknown as { _targetLog: string[] })._targetLog;
    expect(targetLog).toContain('add:packages/example/package.json');
    expect(targetLog).toContain('remove:packages/example/package.json');
    // Root and API manifests must be byte-identical (untouched by add/rollback).
    const rootAfter = new TextDecoder().decode(map.get('/project/package.json')!);
    expect(rootAfter).toBe(JSON.stringify({ name: 'root', dependencies: {} }));
    const apiAfter = new TextDecoder().decode(map.get('/project/apps/api/package.json')!);
    expect(apiAfter).toBe(JSON.stringify({ name: '@app/api', dependencies: {} }));
  });
});
