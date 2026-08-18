/**
 * Bundle internal workspace dependencies into the CLI distribution.
 *
 * During monorepo development the CLI resolves @projectforge/* packages via
 * the pnpm workspace protocol.  For a standalone tarball those packages are
 * not published yet, so we copy their compiled output into the CLI dist and
 * rewrite the CLI's compiled JavaScript imports to use relative paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.resolve(__dirname, '..');
const DIST = path.join(CLI_ROOT, 'dist');
const MONOREPO = path.resolve(CLI_ROOT, '..');

// Packages to bundle — their compiled output is copied into dist/<name>/
const INTERNAL_PACKAGES = [
  { name: 'schemas', srcDir: path.join(MONOREPO, 'schemas', 'dist') },
  { name: 'engine',   srcDir: path.join(MONOREPO, 'engine', 'dist') },
  { name: 'registry', srcDir: path.join(MONOREPO, 'registry', 'dist') },
];

// 1. Copy each internal package's compiled output into dist/<name>/
for (const pkg of INTERNAL_PACKAGES) {
  const dest = path.join(DIST, pkg.name);
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  copyDir(pkg.srcDir, dest);
  console.log(`Bundled @projectforge/${pkg.name} into dist/${pkg.name}/`);
}

// 2. Rewrite CLI dist .js files to use relative imports instead of package names.
//    The relative path is computed per-file so that files nested in subdirectories
//    (e.g. dist/engine/errors.js) correctly resolve (e.g. ../schemas/index.js).
rewriteImports(DIST, INTERNAL_PACKAGES);
console.log('Rewrote dist imports for standalone execution');

// --- helpers ---

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

/**
 * Walk every .js file in `dir` (excluding bundled/ templates) and rewrite
 * `from '@projectforge/<pkg>'` / `from '@projectforge/<pkg>/index.js'`
 * into a relative path computed from that file's directory to `dist/<pkg>/index.js`.
 */
function rewriteImports(dir, packages) {
  const bundledDirs = new Map();
  for (const pkg of packages) {
    bundledDirs.set(pkg.name, path.join(dir, pkg.name));
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    // Skip files inside bundled/ templates — those are starter/module templates.
    if (entry.parentPath) {
      const rel = path.relative(dir, entry.parentPath).replace(/\\/g, '/');
      if (rel.startsWith('bundled/')) continue;
    }
    const filePath = path.join(entry.parentPath ?? dir, entry.name);
    const fileDir = path.dirname(filePath);
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    for (const { name } of packages) {
      const pkgDir = bundledDirs.get(name);
      const importName = `@projectforge/${name}`;
      const escaped = importName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Compute the relative path from this file's directory to dist/<name>/index.js
      const targetRel = path.relative(fileDir, path.join(pkgDir, 'index.js')).replace(/\\/g, '/');
      // Ensure it starts with ./ or ../
      const relPath = targetRel.startsWith('.') ? targetRel : './' + targetRel;

      const regex = new RegExp(`(from\\s*['"])${escaped}(/index\\.js)?(['"])`, 'g');
      const newContent = content.replace(regex, `$1${relPath}$3`);
      if (newContent !== content) {
        changed = true;
        content = newContent;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }
}
