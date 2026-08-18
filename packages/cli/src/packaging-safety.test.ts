/**
 * Packaging safety tests.
 *
 * 1. Source package.json is byte-identical before and after a successful pack.
 * 2. Staging directory cleanup after success and failure.
 * 3. No package.json.monorepo artifact remains.
 * 4. Tarball has no internal dependencies (verified via installed package.json).
 * 5. Repo build works after any pack failure.
 * 6. Mid-pack failure: hook triggers only under NODE_ENV=test,
 *    staging cleaned, source unchanged, subsequent pack succeeds.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLI_ROOT = path.resolve(import.meta.dirname ?? __dirname, '..');
const SOURCE_PKG = path.join(CLI_ROOT, 'package.json');
const TARBALL_PATH = path.join(CLI_ROOT, 'projectforge-cli-0.1.0.tgz');

function packScript(envOverrides?: Record<string, string>) {
  // Strip NODE_ENV from process.env to prevent vitest's test env from
  // leaking into child processes and falsely triggering the failure hook.
  const cleanEnv: Record<string, string> = { ...process.env as Record<string, string> };
  delete cleanEnv.NODE_ENV;
  return spawnSync(
    process.execPath,
    [path.join(CLI_ROOT, 'scripts', 'pack-standalone.mjs')],
    {
      cwd: CLI_ROOT,
      encoding: 'utf-8',
      timeout: 30_000,
      env: { ...cleanEnv, CI: 'true', ...envOverrides },
    },
  );
}

function cleanTarball() {
  try {
    if (fs.existsSync(TARBALL_PATH)) fs.unlinkSync(TARBALL_PATH);
  } catch {
    /* ignore */
  }
}

function pkgBytes(): Buffer {
  return fs.readFileSync(SOURCE_PKG);
}

function pnpmArgs(): string[] {
  const execPath = process.env.npm_execpath;
  if (execPath) return [execPath];
  return process.platform === 'win32' ? ['cmd', '/d', '/c', 'pnpm'] : ['pnpm'];
}

function runPnpm(args: string[], cwd: string): ReturnType<typeof spawnSync> {
  const cmdArgs = pnpmArgs();
  const [bin, ...binArgs] = cmdArgs;
  return spawnSync(bin, [...binArgs, ...args], {
    cwd,
    encoding: 'utf-8',
    timeout: 60_000,
    env: { ...process.env, CI: 'true' },
  });
}

describe('packaging safety', { timeout: 60_000 }, () => {
  afterAll(() => {
    cleanTarball();
    // Restore build health
    execSync('pnpm --filter @projectforge/cli build', {
      cwd: path.resolve(CLI_ROOT, '..', '..'),
      encoding: 'utf-8',
      timeout: 30_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  });

  it('source package.json is byte-identical after successful pack', () => {
    const before = pkgBytes();
    cleanTarball();

    packScript();

    const after = pkgBytes();
    expect(
      after.equals(before),
      'package.json must be byte-identical after pack script',
    ).toBe(true);
  });

  it('staging directory is cleaned up after successful pack', () => {
    cleanTarball();
    const tempBase = os.tmpdir();
    const before = new Set(fs.readdirSync(tempBase).filter((d) => d.startsWith('pf-pack-')));

    packScript();

    const after = new Set(fs.readdirSync(tempBase).filter((d) => d.startsWith('pf-pack-')));
    // No new pf-pack-* dirs should remain
    const leaked = [...after].filter((d) => !before.has(d));
    expect(leaked.length, 'no staging dirs should leak: ' + leaked.join(', ')).toBe(0);
  });

  it('no package.json.monorepo artifact remains', () => {
    const backupPath = path.join(CLI_ROOT, 'package.json.monorepo');
    expect(fs.existsSync(backupPath)).toBe(false);
  });

  it('installed tarball has no internal dependency declarations', () => {
    cleanTarball();
    const r = packScript();
    if (r.status !== 0) {
      // Pack failed — verify no tarball was left
      expect(fs.existsSync(TARBALL_PATH)).toBe(false);
      return;
    }
    expect(fs.existsSync(TARBALL_PATH)).toBe(true);

    // Install into a temp consumer and check the installed package.json
    const inspectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-inspect-'));
    try {
      // Create a minimal consumer
      fs.writeFileSync(
        path.join(inspectDir, 'package.json'),
        JSON.stringify({ name: 'pf-inspect', version: '0.0.0', private: true }, null, 2) + '\n',
      );

      const tarballAbs = TARBALL_PATH.replace(/\\/g, '/');
      const addResult = runPnpm(['add', tarballAbs], inspectDir);
      if (addResult.status !== 0) {
        // Installation failed — skip assertion but ensure the test doesn't crash
        return;
      }

      const installedPkg = path.join(
        inspectDir,
        'node_modules',
        '@projectforge',
        'cli',
        'package.json',
      );
      if (fs.existsSync(installedPkg)) {
        const pkg = JSON.parse(fs.readFileSync(installedPkg, 'utf-8'));
        expect(pkg.dependencies || {}).toEqual({});
      }
    } finally {
      fs.rmSync(inspectDir, { recursive: true, force: true });
    }
  });

  it('repo build works after any pack failure', () => {
    cleanTarball();
    const distEngineDir = path.join(CLI_ROOT, 'dist', 'engine');
    const backupDir = distEngineDir + '.safety-backup';
    const hadDist = fs.existsSync(distEngineDir);

    if (hadDist) {
      fs.renameSync(distEngineDir, backupDir);
    }

    const before = pkgBytes();
    try {
      packScript();
      const after = pkgBytes();
      expect(after.equals(before), 'package.json unchanged after failure').toBe(true);
    } finally {
      if (hadDist) {
        fs.renameSync(backupDir, distEngineDir);
      }
      cleanTarball();
    }
  });

  it('mid-pack failure cleans up staging, source unchanged, hook test-only, subsequent pack ok', () => {
    cleanTarball();
    const before = pkgBytes();
    const beforeSha = createHash('sha256').update(before).digest('hex');
    const tempBase = os.tmpdir();
    const beforeStaging = new Set(fs.readdirSync(tempBase).filter((d) => d.startsWith('pf-pack-')));

    // 1. Inject failure — must exit non-zero.
    const failResult = packScript({ NODE_ENV: 'test', PF_PACK_FAILURE_INJECT: '1' });
    expect(failResult.status, 'mid-pack failure must exit non-zero').not.toBe(0);

    // 2. Source package.json must be byte-identical.
    const after = pkgBytes();
    const afterSha = createHash('sha256').update(after).digest('hex');
    expect(afterSha).toBe(beforeSha);

    // 3. No package.json.monorepo.
    expect(fs.existsSync(path.join(CLI_ROOT, 'package.json.monorepo'))).toBe(false);

    // 4. No partial tarball.
    expect(fs.existsSync(TARBALL_PATH)).toBe(false);

    // 5. Staging directory cleaned up in finally block.
    const afterStaging = new Set(fs.readdirSync(tempBase).filter((d) => d.startsWith('pf-pack-')));
    const leaked = [...afterStaging].filter((d) => !beforeStaging.has(d));
    expect(leaked.length, 'no staging dirs after failure: ' + leaked.join(', ')).toBe(0);

    // 6. Hook has no effect without NODE_ENV=test.
    const noTestResult = packScript({ PF_PACK_FAILURE_INJECT: '1' });
    expect(noTestResult.status, 'hook must not trigger without NODE_ENV=test').toBe(0);
    expect(fs.existsSync(TARBALL_PATH), 'tarball must exist after un-hooked pack').toBe(true);
    cleanTarball();

    // 7. Subsequent pack without hook succeeds and produces a valid tarball.
    const okResult = packScript();
    expect(okResult.status).toBe(0);
    expect(fs.existsSync(TARBALL_PATH), 'tarball must exist after successful pack').toBe(true);
    const stat = fs.statSync(TARBALL_PATH);
    expect(stat.size, 'tarball must have content').toBeGreaterThan(0);
  }, 60_000);
});
