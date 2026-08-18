/**
 * Bundle the local registry (starters + modules) into the CLI distribution.
 *
 * This copies manifests and templates from `packages/registry/` into
 * `packages/cli/dist/bundled/` so the CLI can ship with an embedded,
 * self-contained registry that needs no source-tree or network access.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(__dirname, '..');
const REGISTRY_ROOT = path.resolve(CLI_ROOT, '..', 'registry');
const BUNDLED_ROOT = path.join(CLI_ROOT, 'dist', 'bundled');

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

// Clean previous
if (fs.existsSync(BUNDLED_ROOT)) {
  fs.rmSync(BUNDLED_ROOT, { recursive: true, force: true });
}

// Copy starters
const startersDir = path.join(REGISTRY_ROOT, 'starters');
if (fs.existsSync(startersDir)) {
  for (const entry of fs.readdirSync(startersDir, { withFileTypes: true })) {
    const src = path.join(startersDir, entry.name);
    const dest = path.join(BUNDLED_ROOT, 'starters', entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
}

// Copy modules
const modulesDir = path.join(REGISTRY_ROOT, 'modules');
if (fs.existsSync(modulesDir)) {
  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    const src = path.join(modulesDir, entry.name);
    const dest = path.join(BUNDLED_ROOT, 'modules', entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
}

console.log(`Bundled registry into ${path.relative(CLI_ROOT, BUNDLED_ROOT)}`);
