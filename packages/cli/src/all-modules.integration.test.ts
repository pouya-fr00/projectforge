/**
 * All-modules installed-artifact regression test.
 *
 * Reproduces the Phase 9 Slice 3 blocker: a project created from the packed
 * CLI tarball with comments + user-dashboard + admin-dashboard used to fail
 * `pnpm -r typecheck` (TS2307 on `@workspace/contracts/auth`) and the
 * generated web route registry only kept the LAST added module's routes
 * (each `add` regenerated `apps/web/src/features/index.tsx` from only the
 * newly requested modules, clobbering earlier routes).
 *
 * This test runs the REAL flow from the tarball:
 *   create -> add comments -> add user-dashboard -> add admin-dashboard
 *   -> repeat add -> install -> migrate -> typecheck -> test -> build
 *
 * No skip is allowed. It must pass only after the template/planner fixes.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLI_ROOT = path.resolve(import.meta.dirname ?? __dirname, '..');
const TARBALL_NAME = 'projectforge-cli-0.1.0.tgz';
const TARBALL_PATH = path.join(CLI_ROOT, TARBALL_NAME);

function runPnpm(args: string[], cwd: string, timeout = 180_000): ReturnType<typeof spawnSync> {
  if (process.platform === 'win32') {
    return spawnSync('cmd', ['/d', '/c', 'pnpm', ...args], {
      cwd,
      encoding: 'utf-8',
      timeout,
      env: { ...process.env, CI: '1' },
    });
  }
  return spawnSync('pnpm', args, {
    cwd,
    encoding: 'utf-8',
    timeout,
    env: { ...process.env, CI: '1' },
  });
}

function assertOk(result: ReturnType<typeof spawnSync>, label: string): void {
  if (result.status !== 0) {
    throw new Error(
      [
        `command: ${label}`,
        `exit: ${result.status}`,
        `signal: ${result.signal ?? 'none'}`,
        `spawn error: ${result.error?.message ?? 'none'}`,
        `stdout:`,
        result.stdout ?? '(null)',
        `stderr:`,
        result.stderr ?? '(null)',
      ].join('\n')
    );
  }
}

let consumerDir = '';
let projectDir = '';

describe('all-modules installed artifact', { timeout: 900_000 }, () => {
  beforeAll(() => {
    consumerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-allmodules-test-'));

    // 1. Pack the standalone tarball.
    const packResult = spawnSync(process.execPath, [path.join(CLI_ROOT, 'scripts', 'pack-standalone.mjs')], {
      cwd: CLI_ROOT,
      encoding: 'utf-8',
      timeout: 60_000,
      env: { ...process.env, CI: 'true' },
    });
    assertOk(packResult, 'pack-standalone');
    expect(fs.existsSync(TARBALL_PATH), 'tarball should exist').toBe(true);

    // 2. Consumer workspace with the tarball installed.
    fs.mkdirSync(consumerDir, { recursive: true });
    fs.writeFileSync(
      path.join(consumerDir, 'package.json'),
      JSON.stringify({ name: 'projectforge-allmodules-consumer', version: '0.0.0', private: true }, null, 2) + '\n'
    );
    assertOk(runPnpm(['add', TARBALL_PATH], consumerDir, 300_000), 'pnpm add tarball');
  });

  afterAll(() => {
    try {
      if (consumerDir) fs.rmSync(consumerDir, { recursive: true, force: true });
    } catch { /* best-effort */ }
    try {
      if (fs.existsSync(TARBALL_PATH)) fs.unlinkSync(TARBALL_PATH);
    } catch { /* best-effort */ }
  }, 30_000);

  function installedBin(): string {
    return path.join(consumerDir, 'node_modules', '@projectforge', 'cli', 'bin', 'projectforge.js');
  }

  function runInstalledCli(args: string[], opts?: { cwd?: string; timeout?: number }): ReturnType<typeof spawnSync> {
    return spawnSync(process.execPath, [installedBin(), ...args], {
      encoding: 'utf-8',
      timeout: opts?.timeout ?? 120_000,
      cwd: opts?.cwd ?? consumerDir,
    });
  }

  it('creates the project and adds all three product-shell modules (no-install)', () => {
    const create = runInstalledCli(['create', 'my-app', '--no-install', '--json'], { timeout: 60_000 });
    expect(create.status, `create failed: ${create.stderr}`).toBe(0);

    projectDir = path.join(consumerDir, 'my-app');
    expect(fs.existsSync(path.join(projectDir, 'projectforge.json'))).toBe(true);

    for (const mod of ['comments', 'user-dashboard', 'admin-dashboard']) {
      const add = runInstalledCli(['add', mod, '--no-install', '--json'], { cwd: projectDir, timeout: 60_000 });
      expect(add.status, `add ${mod} failed: ${add.stderr}`).toBe(0);
    }

    // Repeat add — must be a deterministic no-op.
    const repeat = runInstalledCli(['add', 'comments', '--no-install', '--json'], { cwd: projectDir, timeout: 60_000 });
    expect(repeat.status, `repeat add failed: ${repeat.stderr}`).toBe(0);

    const config = JSON.parse(fs.readFileSync(path.join(projectDir, 'projectforge.json'), 'utf-8'));
    expect(config.modules).toContain('comments');
    expect(config.modules).toContain('user-dashboard');
    expect(config.modules).toContain('admin-dashboard');
  });

  it('web route registry preserves ALL module routes after repeated adds', () => {
    const featuresPath = path.join(projectDir, 'apps/web/src/features/index.tsx');
    expect(fs.existsSync(featuresPath)).toBe(true);
    const content = fs.readFileSync(featuresPath, 'utf-8');

    // All three product-shell web routes must be present (Bug A regression).
    expect(content).toContain("{ path: '/comments', element: <Comments /> }");
    expect(content).toContain("{ path: '/dashboard', element: <Dashboard /> }");
    expect(content).toContain("{ path: '/admin', element: <Admin /> }");
  });

  it('apps/web declares @workspace/contracts so contract type imports resolve (Bug B regression)', () => {
    const webPkgPath = path.join(projectDir, 'apps/web/package.json');
    expect(fs.existsSync(webPkgPath)).toBe(true);
    const webPkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf-8'));
    expect(webPkg.dependencies['@workspace/contracts']).toBe('workspace:*');
  });

  it('installs, migrates, typechecks, tests, and builds the all-modules project', () => {
    assertOk(runPnpm(['install'], projectDir, 600_000), 'pnpm install');

    const migrate = spawnSync(process.execPath, ['migrations/runner.mjs'], {
      cwd: projectDir,
      encoding: 'utf-8',
      timeout: 60_000,
      env: { ...process.env, CI: '1' },
    });
    expect(migrate.status, `migrate failed: ${migrate.stderr}`).toBe(0);

    assertOk(runPnpm(['-r', 'typecheck'], projectDir, 600_000), 'typecheck');
    assertOk(runPnpm(['-r', '--workspace-concurrency=1', 'test'], projectDir, 600_000), 'test');
    assertOk(runPnpm(['-r', 'build'], projectDir, 600_000), 'build');
  });
});
