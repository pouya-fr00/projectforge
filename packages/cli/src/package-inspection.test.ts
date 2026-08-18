/**
 * Phase 9 — npm Package Inspection Tests
 *
 * Verifies the standalone tarball is release-ready by inspecting
 * package metadata, dependency declarations, bundled registry, and
 * file contents. No network, no npm publish, no Owner gate.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLI_ROOT = path.resolve(import.meta.dirname ?? __dirname, '..');
const REPO_ROOT = path.resolve(CLI_ROOT, '..', '..');
const TARBALL_PATH = path.join(CLI_ROOT, 'projectforge-cli-0.1.0.tgz');

let INSPECT_DIR = '';
let EXTRACT_DIR = '';

function listAllFiles(dir: string): string[] {
  const result: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        result.push(path.relative(dir, full).replace(/\\/g, '/'));
      }
    }
  }
  walk(dir);
  return result.sort();
}

function grepInFiles(dir: string, pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const f of listAllFiles(dir)) {
    const full: string = path.join(dir, String(f));
    try {
      const content = fs.readFileSync(full, 'utf-8');
      if (pattern.test(content)) {
        hits.push(String(f));
      }
    } catch {
      // binary file — skip
    }
  }
  return hits;
}

describe('npm package inspection', { timeout: 120_000 }, () => {
  beforeAll(() => {
    // Clean any stale tarball
    try { fs.unlinkSync(TARBALL_PATH); } catch { /* ok */ }

    // Build CLI (produces dist/)
    execSync('pnpm --filter @projectforge/cli build', {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 30_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Pack standalone tarball
    const packResult = spawnSync(
      process.execPath,
      [path.join(CLI_ROOT, 'scripts', 'pack-standalone.mjs')],
      { cwd: CLI_ROOT, encoding: 'utf-8', timeout: 30_000 },
    );
    if (packResult.status !== 0) {
      console.error('Pack failed:', packResult.stderr);
      throw new Error('Standalone pack failed before inspection tests');
    }

    // Extract tarball for deep inspection
    EXTRACT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-inspect-extract-'));
    // Copy tarball to extract dir to avoid Windows C: path issues with tar
    const localTgz = path.join(EXTRACT_DIR, 'pkg.tgz');
    fs.copyFileSync(TARBALL_PATH, localTgz);
    execSync(`tar -xzf pkg.tgz`, {
      cwd: EXTRACT_DIR,
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    fs.unlinkSync(localTgz);

    // Install into consumer
    INSPECT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-inspect-'));
    fs.writeFileSync(
      path.join(INSPECT_DIR, 'package.json'),
      JSON.stringify({ name: 'pf-inspect', version: '0.0.0', private: true }, null, 2) + '\n',
    );
    execSync(`pnpm add "${TARBALL_PATH.replace(/\\/g, '/')}"`, {
      cwd: INSPECT_DIR,
      encoding: 'utf-8',
      timeout: 30_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  });

  afterAll(() => {
    try { fs.unlinkSync(TARBALL_PATH); } catch { /* ok */ }
    if (INSPECT_DIR && fs.existsSync(INSPECT_DIR)) {
      fs.rmSync(INSPECT_DIR, { recursive: true, force: true });
    }
    if (EXTRACT_DIR && fs.existsSync(EXTRACT_DIR)) {
      fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
    }
  });

  // ─── Package metadata ──────────────────────────────────────────

  it('package.json has correct metadata', () => {
    const pkgPath = path.join(EXTRACT_DIR, 'package', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    expect(pkg.name).toBe('@projectforge/cli');
    expect(pkg.version).toBe('0.1.0');
    expect(pkg.type).toBe('module');
    expect(pkg.license).toBe('MIT');
    expect(pkg.bin).toBeDefined();
    expect(pkg.bin.projectforge).toBe('./bin/projectforge.js');
    expect(Array.isArray(pkg.files)).toBe(true);
  });

  it('package.json has no internal/workspace dependencies', () => {
    const pkgPath = path.join(EXTRACT_DIR, 'package', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    // Should have NO dependencies field at all (standalone)
    const deps = pkg.dependencies || {};
    expect(Object.keys(deps).length, 'no runtime dependencies').toBe(0);

    const devDeps = pkg.devDependencies || {};
    expect(Object.keys(devDeps).length, 'no dev dependencies').toBe(0);

    // Verify no workspace:* references anywhere in the JSON
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    expect(raw).not.toContain('workspace:');
    expect(raw).not.toContain('file:');
    expect(raw).not.toContain('link:');
  });

  // ─── File contents safety ──────────────────────────────────────

  it('contains no secrets, absolute paths, or private data', () => {
    const dir = path.join(EXTRACT_DIR, 'package');

    // No absolute local paths referencing the repository
    const absolutPathHits = grepInFiles(dir, /C:\\Users\\HP\\Desktop\\Project\\ProjectFactory/i);
    expect(absolutPathHits, 'no absolute repo paths in artifact: ' + absolutPathHits.join(', '))
      .toEqual([]);

    // No common secret patterns
    const secretHits = grepInFiles(dir, /BETTER_AUTH_SECRET\s*=\s*[A-Za-z0-9+/=]{20,}/);
    expect(secretHits, 'no hardcoded secrets in artifact').toEqual([]);

    // No API keys
    const apiKeyHits = grepInFiles(dir, /(sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z\-_]{20,})/);
    expect(apiKeyHits, 'no API keys in artifact').toEqual([]);
  });

  it('contains no source maps, test files, or temp artifacts', () => {
    const dir = path.join(EXTRACT_DIR, 'package');
    const allFiles = listAllFiles(dir);
    // Exclude bundled registry templates — .ts files there are legitimate
    // module/starter templates, not raw source code.
    const nonRegistry = allFiles.filter(f => !f.startsWith('dist/bundled/'));

    // No .tgz files inside the tarball
    const tgzInside = nonRegistry.filter(f => f.endsWith('.tgz'));
    expect(tgzInside, 'no .tgz files inside artifact').toEqual([]);

    // No test files (outside registry templates)
    const testFiles = nonRegistry.filter(f => f.includes('.test.') || f.includes('.spec.'));
    expect(testFiles, 'no test files in production artifact: ' + testFiles.join(', '))
      .toEqual([]);

    // No TypeScript source files outside registry templates (only .js and .d.ts)
    const tsFiles = nonRegistry.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
    expect(tsFiles, 'no raw .ts source in artifact outside registry templates')
      .toEqual([]);

    // No temp/backup files
    const tempFiles = nonRegistry.filter(f =>
      f.startsWith('.') || f.includes('/.') || f.endsWith('~') || f.includes('backup'),
    );
    expect(tempFiles, 'no temp/backup/hidden files in artifact').toEqual([]);
  });

  // ─── Bundled registry ──────────────────────────────────────────

  it('bundled registry contains the expected starters and modules', () => {
    const registryDir = path.join(EXTRACT_DIR, 'package', 'dist', 'bundled');

    // Registry directory must exist
    expect(fs.existsSync(registryDir), 'dist/registry must exist').toBe(true);

    // Starters
    const startersDir = path.join(registryDir, 'starters');
    expect(fs.existsSync(startersDir), 'starters dir must exist').toBe(true);
    const starters = fs.readdirSync(startersDir).filter(f => f.endsWith('.json'));
    expect(starters).toContain('default.json');

    // Modules
    const modulesDir = path.join(registryDir, 'modules');
    expect(fs.existsSync(modulesDir), 'modules dir must exist').toBe(true);
    const modules = fs.readdirSync(modulesDir).filter(f => f.endsWith('.json'));
    expect(modules).toEqual(expect.arrayContaining([
      'admin-dashboard.json',
      'auth.json',
      'comments.json',
      'database-d1.json',
      'rbac.json',
      'user-dashboard.json',
    ]));
  });

  it('bundled registry manifest files are valid JSON', () => {
    const registryDir = path.join(EXTRACT_DIR, 'package', 'dist', 'bundled');

    function checkDir(dir: string, label: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(full, label + '/' + entry.name);
        } else if (entry.name.endsWith('.json')) {
          const raw = fs.readFileSync(full, 'utf-8');
          expect(() => JSON.parse(raw), `${label}/${entry.name} must be valid JSON`)
            .not.toThrow();
        }
      }
    }

    checkDir(registryDir, 'registry');
  });

  // ─── Installed CLI ─────────────────────────────────────────────

  it('installed CLI bin resolves and executes', () => {
    const binPath = path.join(
      INSPECT_DIR, 'node_modules', '@projectforge', 'cli', 'bin', 'projectforge.js',
    );
    expect(fs.existsSync(binPath), 'installed bin must exist').toBe(true);

    // Must be outside the monorepo
    const resolved = path.resolve(binPath);
    expect(resolved, 'installed bin must be outside monorepo').not.toContain(
      path.resolve(REPO_ROOT),
    );

    // --version
    const versionResult = spawnSync(process.execPath, [binPath, '--version'], {
      encoding: 'utf-8',
      timeout: 5_000,
    });
    expect(versionResult.status).toBe(0);
    const tarballPkg = JSON.parse(fs.readFileSync(
      path.join(EXTRACT_DIR, 'package', 'package.json'), 'utf-8',
    ));
    const expectedVersion = tarballPkg.version;
    expect(versionResult.stdout.trim(), 'CLI --version must match tarball package version')
      .toBe(expectedVersion);

    // --help
    const helpResult = spawnSync(process.execPath, [binPath, '--help'], {
      encoding: 'utf-8',
      timeout: 5_000,
    });
    expect(helpResult.status).toBe(0);
    expect(helpResult.stdout).toContain('projectforge');

    // list --json
    const listResult = spawnSync(process.execPath, [binPath, 'list', '--json'], {
      encoding: 'utf-8',
      timeout: 5_000,
    });
    expect(listResult.status).toBe(0);
    const listData = JSON.parse(listResult.stdout);
    expect(listData.ok).toBe(true);
    expect(listData.data.starters).toContain('default');
    expect(listData.data.modules.length).toBe(6);
  });

  // ─── Manifest and file-list integrity ──────────────────────────

  it('package.json files array matches actual tarball content', () => {
    const pkgPath = path.join(EXTRACT_DIR, 'package', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const declared = new Set<string>(pkg.files ?? []);

    const actualFiles = listAllFiles(path.join(EXTRACT_DIR, 'package'))
      .filter(f => f !== 'package.json'); // package.json always included

    // Every file in the tarball should be covered by "files" glob
    // or be a standard-included file (package.json, README, LICENSE, CHANGELOG)
    const standardFiles = new Set(['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md']);
    const uncovered = actualFiles.filter(f => {
      if (standardFiles.has(f)) return false;
      // Check against files glob patterns (simple prefix match)
      for (const pattern of declared) {
        if (f.startsWith(pattern) || f.startsWith(pattern.replace(/\/\*$/, '/'))) return false;
      }
      return true;
    });

    expect(
      uncovered.length,
      'all tarball files covered by "files" field or standard files: ' + uncovered.join(', '),
    ).toBe(0);
  });

  // ─── Tarball determinism ───────────────────────────────────────

  it('two independent packs produce identical extracted content', () => {
    // Pack a second time to a different temp location
    const tempTarball = path.join(os.tmpdir(), 'pf-inspect-second.tgz');
    const tempExtract = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-inspect-extract2-'));

    try {
      const r2 = spawnSync(
        process.execPath,
        [path.join(CLI_ROOT, 'scripts', 'pack-standalone.mjs')],
        { cwd: CLI_ROOT, encoding: 'utf-8', timeout: 30_000 },
      );
      expect(r2.status, 'second pack must succeed').toBe(0);

      // Copy to a known temp path (pack-standalone always outputs to CLI_ROOT)
      fs.copyFileSync(TARBALL_PATH, tempTarball);

      // Copy tarball to extract dir for cross-platform tar extraction
      const localTgz2 = path.join(tempExtract, 'pkg.tgz');
      fs.copyFileSync(tempTarball, localTgz2);
      execSync('tar -xzf pkg.tgz', {
        cwd: tempExtract,
        encoding: 'utf-8',
        timeout: 10_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      fs.unlinkSync(localTgz2);

      // Compare file lists
      const files1 = listAllFiles(path.join(EXTRACT_DIR, 'package'));
      const files2 = listAllFiles(path.join(tempExtract, 'package'));
      expect(files1).toEqual(files2);

      // Compare file contents
      for (const f of files1) {
        const content1 = fs.readFileSync(path.join(EXTRACT_DIR, 'package', f));
        const content2 = fs.readFileSync(path.join(tempExtract, 'package', f));
        expect(content1.equals(content2), `file ${f} must be identical between packs`).toBe(true);
      }
    } finally {
      try { fs.unlinkSync(tempTarball); } catch { /* ok */ }
      if (fs.existsSync(tempExtract)) {
        fs.rmSync(tempExtract, { recursive: true, force: true });
      }
    }
  });
});
