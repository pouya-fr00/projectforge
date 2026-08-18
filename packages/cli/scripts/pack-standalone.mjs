/**
 * Safe standalone packaging script.
 *
 * Creates a self-contained CLI tarball without mutating any tracked source
 * files.  The approach:
 *
 * 1. Copy `bin/`, `dist/`, `LICENSE` into a staging directory outside the repo.
 * 2. Generate a staging-only `package.json` with internal deps removed.
 * 3. Run `pnpm pack` on the staging directory, output to CLI root.
 * 4. Clean up the staging directory in a `finally` block.
 *
 * The source `package.json` is NEVER touched — no prepack/postpack mutation.
 *
 * Test-only failure injection: set NODE_ENV=test PF_PACK_FAILURE_INJECT=1
 * to trigger a controlled failure after staging setup but before pnpm pack.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(CLI_ROOT, '..', '..');
const DIST = path.join(CLI_ROOT, 'dist');
const BIN = path.join(CLI_ROOT, 'bin');
const LICENSE = path.join(REPO_ROOT, 'LICENSE');
const SOURCE_PKG = path.join(CLI_ROOT, 'package.json');
const ROOT_PKG = path.join(REPO_ROOT, 'package.json');

function isFailureInjected() {
  return (
    process.env.NODE_ENV === 'test' &&
    process.env.PF_PACK_FAILURE_INJECT === '1'
  );
}

function main() {
  let staging = '';
  let failed = false;
  try {
    staging = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-pack-'));

    copyDir(DIST, path.join(staging, 'dist'));
    copyDir(BIN, path.join(staging, 'bin'));
    if (fs.existsSync(LICENSE)) {
      fs.copyFileSync(LICENSE, path.join(staging, 'LICENSE'));
    }

    // Test-only failure injection: trigger after staging setup,
    // before pnpm pack.  Exercises staging cleanup in finally block.
    if (isFailureInjected()) {
      throw new Error('PF_PACK_FAILURE_INJECT: simulated mid-pack failure');
    }

    // Generate staging-only package.json (no internal workspace deps).
    // Pull license from root package.json since the CLI package doesn't
    // declare one (monorepo convention: license lives at the root).
    const sourcePkg = JSON.parse(fs.readFileSync(SOURCE_PKG, 'utf-8'));
    const rootPkg = JSON.parse(fs.readFileSync(ROOT_PKG, 'utf-8'));
    const stagingPkg = {
      name: sourcePkg.name,
      version: sourcePkg.version,
      description: sourcePkg.description || '',
      type: sourcePkg.type,
      main: sourcePkg.main,
      bin: sourcePkg.bin,
      license: sourcePkg.license || rootPkg.license,
      files: sourcePkg.files,
    };
    fs.writeFileSync(path.join(staging, 'package.json'), JSON.stringify(stagingPkg, null, 2) + '\n');

    // Run pnpm pack in staging, output to CLI root
    const destDir = CLI_ROOT.replace(/\\/g, '/');
    execSync('pnpm pack --pack-destination "' + destDir + '"', {
      cwd: staging,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const tarballPath = path.join(CLI_ROOT, 'projectforge-cli-0.1.0.tgz');
    if (!fs.existsSync(tarballPath)) {
      console.error('Tarball not found at', tarballPath);
      process.exit(1);
    }

    const stat = fs.statSync(tarballPath);
    console.log('Packaged:', tarballPath, '(' + stat.size + ' bytes)');
  } catch (err) {
    console.error('Packaging failed:', err instanceof Error ? err.message : String(err));
    failed = true;
  } finally {
    if (staging && fs.existsSync(staging)) {
      fs.rmSync(staging, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  }
  if (failed) process.exit(1);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

main();
