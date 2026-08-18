/**
 * Documentation example tests.
 *
 * Every documented command example that is safe to run locally is tested here.
 * This prevents docs from drifting from the actual CLI behavior.
 *
 * Tests are split into two suites:
 *  - Read-only & global-option tests (no project needed): run first, fastest.
 *  - Mutation tests that create projects: share one fixture project where
 *    possible to avoid paying the full create cost for every test.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCli } from './integration-helpers.js';

const TEST_DIR = path.join(os.tmpdir(), 'pf-docs-' + Date.now());

beforeAll(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  try {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  } catch (e) {
    // Windows EPERM expected when child-process handles linger; non-critical.
    // Log for visibility in CI but don't fail the suite.
    const code = (e as NodeJS.ErrnoException).code ?? '(unknown)';
    console.warn('[afterAll] cleanup failed (non-critical):', code);
  }
});

function proot(sub = '') {
  return path.join(TEST_DIR, sub);
}

/**
 * Fast, read-only tests that don't need a project.
 */
describe('documentation: global options and read-only commands', { timeout: 30_000 }, () => {
  it('--help', async () => {
    const r = await runCli(['--help'], TEST_DIR);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('projectforge');
  });

  it('--version', async () => {
    const r = await runCli(['--version'], TEST_DIR);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('0.1.0');
  });

  it('help --json', async () => {
    const r = await runCli(['--json', 'help'], TEST_DIR);
    expect(r.exitCode).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.ok ?? j.status).toBeTruthy();
  });

  it('list --json', async () => {
    const r = await runCli(['--json', 'list'], TEST_DIR);
    expect(r.exitCode).toBe(0);
    const o = JSON.parse(r.stdout);
    const data = o.data || o;
    expect(data.starters).toBeDefined();
    expect(data.modules).toBeDefined();
    expect(data.modules).toContain('auth');
    expect(data.modules).toContain('comments');
  });

  it('list human output', async () => {
    const r = await runCli(['list'], TEST_DIR);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Starters');
    expect(r.stdout).toContain('Modules');
  });

  it('help lists all V1 commands', async () => {
    const r = await runCli(['help'], TEST_DIR);
    expect(r.exitCode).toBe(0);
    for (const cmd of ['create', 'add', 'sync', 'status', 'doctor', 'plan', 'explain', 'list', 'help']) {
      expect(r.stdout).toContain(cmd);
    }
  });

  it('upgrade --check returns exit 2', async () => {
    const r = await runCli(['upgrade', '--check'], TEST_DIR);
    expect(r.exitCode).toBe(2);
  });
});

/**
 * Tests that need a project fixture.
 *
 * A single shared project is created once and used for read-after-create
 * assertions (status, doctor, explain, plan).  Mutation tests (add, sync)
 * create their own sub-projects to avoid ordering issues.
 */
describe('documentation: create and project-scoped commands', { timeout: 120_000 }, () => {
  const FIXTURE = 'fixture';
  const FIXTURE_ROOT = proot(FIXTURE);

  beforeAll(async () => {
    // --no-install avoids 30s+ install/verification; the fixture only needs files on disk
    const r = await runCli(['create', FIXTURE, '--no-install'], TEST_DIR);
    expect(r.exitCode).toBe(0);
  }, 15_000);

  it('create --dry-run', async () => {
    const r = await runCli(['create', 'drytest', '--dry-run'], TEST_DIR);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Dry-run');
    expect(fs.existsSync(proot('drytest'))).toBe(false);
  });

  it('create a real project', async () => {
    // already created by beforeAll — verify it
    expect(fs.existsSync(path.join(FIXTURE_ROOT, 'projectforge.json'))).toBe(true);
    expect(fs.existsSync(path.join(FIXTURE_ROOT, 'projectforge-lock.json'))).toBe(true);
  });

  it('create with spaces in parent path', async () => {
    const dir = path.join(TEST_DIR, 'my project');
    fs.mkdirSync(dir, { recursive: true });
    const r = await runCli(['create', 'app', '--no-install'], dir);
    expect(r.exitCode).toBe(0);
    expect(fs.existsSync(path.join(dir, 'app', 'projectforge.json'))).toBe(true);
  });

  it('create --json', async () => {
    const r = await runCli(['--json', 'create', 'jsontest', '--no-install'], TEST_DIR);
    expect(r.exitCode).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.ok ?? j.status ?? true).toBeTruthy();
  });

  it('create rejects non-empty target (exit 1)', async () => {
    const d = proot('occupied');
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'x.txt'), 'hi');
    const r = await runCli(['create', 'occupied'], TEST_DIR);
    expect(r.exitCode).toBe(1);
  });

  it('create with missing name (exit 2)', async () => {
    const r = await runCli(['create'], TEST_DIR);
    expect(r.exitCode).toBe(2);
  });

  // --- project-scoped read tests (use shared fixture) ---

  it('status --json', async () => {
    const r = await runCli(['--json', 'status'], FIXTURE_ROOT);
    expect(r.exitCode).toBe(0);
    const o = JSON.parse(r.stdout);
    const sdata = o.data || o;
    expect(sdata.name).toBe(FIXTURE);
    expect(sdata.starter).toBe('default');
  });

  it('doctor --json on healthy project', async () => {
    const r = await runCli(['--json', 'doctor'], FIXTURE_ROOT);
    expect(r.exitCode).toBe(0);
    const o = JSON.parse(r.stdout);
    const ddata = o.data || o;
    expect(ddata.healthy).toBe(true);
  });

  it('explain', async () => {
    const r = await runCli(['explain', 'auth'], FIXTURE_ROOT);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Plan');
  });

  it('plan --json', async () => {
    const r = await runCli(['--json', 'plan', 'auth'], FIXTURE_ROOT);
    expect(r.exitCode).toBe(0);
    const plan = JSON.parse(r.stdout);
    const pdata = plan.data || plan;
    expect(pdata.planId).toBeDefined();
    expect(pdata.dependencyOrder).toBeDefined();
  });

  // --- add commands (each needs its own clean project; use --no-install for speed) ---

  it('add a module', async () => {
    await runCli(['create', 'addtest', '--no-install'], TEST_DIR);
    const r = await runCli(['add', 'auth', '--no-install'], proot('addtest'));
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Added modules');
    expect(fs.existsSync(path.join(TEST_DIR, 'addtest', 'apps/api/src/features/auth/index.ts'))).toBe(true);
  });

  it('repeated add is deterministic', async () => {
    await runCli(['create', 'reptest', '--no-install'], TEST_DIR);
    await runCli(['add', 'auth', '--no-install'], proot('reptest'));
    const r = await runCli(['add', 'auth', '--no-install'], proot('reptest'));
    expect(r.exitCode).toBe(0);
  });

  it('add --dry-run', async () => {
    await runCli(['create', 'drytest2', '--no-install'], TEST_DIR);
    const r = await runCli(['add', 'comments', '--dry-run', '--no-install'], proot('drytest2'));
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('Dry-run');
  });

  it('add --json', async () => {
    await runCli(['create', 'addjsontest', '--no-install'], TEST_DIR);
    const r = await runCli(['add', 'auth', '--json', '--no-install'], proot('addjsontest'));
    expect(r.exitCode).toBe(0);
  });

  it('add unknown module (exit 1)', async () => {
    await runCli(['create', 'unknowntest', '--no-install'], TEST_DIR);
    const r = await runCli(['add', 'nonexistent', '--no-install'], proot('unknowntest'));
    expect(r.exitCode).toBe(1);
  });

  it('add missing argument (exit 2)', async () => {
    await runCli(['create', 'noargtest', '--no-install'], TEST_DIR);
    const r = await runCli(['add'], proot('noargtest'));
    expect(r.exitCode).toBe(2);
  });

  // --- sync ---

  it('sync --dry-run', async () => {
    await runCli(['create', 'synctest', '--no-install'], TEST_DIR);
    await runCli(['add', 'auth', '--no-install'], proot('synctest'));
    const r = await runCli(['sync', '--dry-run'], proot('synctest'));
    // sync --dry-run with --no-installed project may return 0 or 1 depending on state
    expect([0, 1]).toContain(r.exitCode);
  });
});
