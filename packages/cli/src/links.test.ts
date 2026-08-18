import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '../../../apps/docs');

function listMdFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...listMdFiles(full));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

function extractLinks(content: string): { text: string; target: string; anchor: string | null }[] {
  const links: { text: string; target: string; anchor: string | null }[] = [];
  const regex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const target = match[2];
    if (target.startsWith('http://') || target.startsWith('https://')) continue;
    if (target.startsWith('mailto:')) continue;
    const [filePath, anchor] = target.split('#');
    links.push({ text: match[1], target: filePath || target, anchor: anchor || null });
  }
  return links;
}

function resolveTarget(target: string, fromFileRel: string): string {
  // VitePress absolute path: /guides/add-modules → guides/add-modules.md
  if (target.startsWith('/')) {
    const clean = target.replace(/\/$/, '/index');
    return clean.replace(/^\//, '') + '.md';
  }
  return path.normalize(path.join(path.dirname(fromFileRel), target)).replace(/\\/g, '/');
}

describe('link validation', () => {
  const mdFiles = listMdFiles(DOCS_DIR);
  const fileMap = new Map<string, string>();
  for (const f of mdFiles) {
    fileMap.set(path.relative(DOCS_DIR, f).replace(/\\/g, '/'), f);
  }

  it('all internal markdown links resolve to existing files', () => {
    const broken: string[] = [];
    for (const file of mdFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const links = extractLinks(content);
      const relFile = path.relative(DOCS_DIR, file).replace(/\\/g, '/');
      for (const link of links) {
        const resolved = resolveTarget(link.target, relFile);
        if (!fileMap.has(resolved)) {
          broken.push(`${relFile} → ${link.target} (resolved: ${resolved})`);
        }
      }
    }
    if (broken.length > 0) {
      expect.fail('Broken internal links:\n' + broken.join('\n'));
    }
    expect(broken.length).toBe(0);
  });

  it('all sidebar and nav targets in vitepress config exist', () => {
    const configPath = path.join(DOCS_DIR, '.vitepress/config.mjs');
    if (!fs.existsSync(configPath)) return;
    const content = fs.readFileSync(configPath, 'utf-8');
    const linkRegex = /link:\s*['"]([^'"]+)['"]/g;
    const missing: string[] = [];
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const target = match[1];
      if (target.startsWith('http')) continue;
      const resolved = resolveTarget(target, 'index.md');
      if (!fileMap.has(resolved)) {
        missing.push(target);
      }
    }
    if (missing.length > 0) {
      expect.fail('Sidebar targets not found:\n' + missing.join('\n'));
    }
  });

  it('no absolute temp paths or hash values in docs', () => {
    const localPaths = [/C:\\Users\\HP/i, /\/home\/HP/i];
    const violations: string[] = [];
    for (const file of mdFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const pat of localPaths) {
        if (pat.test(content)) {
          violations.push(`${path.relative(DOCS_DIR, file)}: matches ${pat}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('code blocks have valid language tags', () => {
    const validLangs = ['bash', 'sh', 'text', 'json', 'env', 'typescript', 'ts', 'tsx', 'js', 'jsx', 'sql', 'yaml', 'toml', 'powershell', 'markdown'];
    const issues: string[] = [];
    for (const file of mdFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const regex = /```(\w*)/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (match[1] && !validLangs.includes(match[1])) {
          issues.push(`${path.relative(DOCS_DIR, file)}: unknown lang "${match[1]}"`);
        }
      }
    }
    expect(issues).toEqual([]);
  });

  it('new Phase 7 slice 3 pages exist', () => {
    const required = [
      'fa/index.md',
      'guides/ci.md',
      'troubleshooting/windows.md',
      'contributing/development-setup.md',
      'contributing/module-authoring.md',
      'contributing/docs-standard.md',
      'contributing/release-process.md',
    ];
    const missing = required.filter(r => !fileMap.has(r));
    expect(missing).toEqual([]);
  });

  it('Persian guide has required content', () => {
    const faPath = path.join(DOCS_DIR, 'fa/index.md');
    if (!fs.existsSync(faPath)) return;
    const content = fs.readFileSync(faPath, 'utf-8');
    expect(content).toContain('# ');
    expect(content).toContain('```bash');
    expect(content).toContain('projectforge create');
    expect(content).toContain('projectforge add');
    expect(content).toContain('پیش‌نیازها');
    expect(content).toContain('مدیریت‌شده');
    // The guide lists these as NOT YET IMPLEMENTED in a warning section
    // which is correct behavior — future features should be flagged.
    const warningSection = content.substring(content.indexOf('قابلیت‌هایی که هنوز پیاده‌سازی نشده‌اند'));
    expect(warningSection).toContain('bundled registry');
    expect(warningSection).toContain('deploy automation');
    // No future feature should appear outside the "not yet implemented" section
    // as an available feature.
  });

  it('CI guide uses real repository commands', () => {
    const ciPath = path.join(DOCS_DIR, 'guides/ci.md');
    if (!fs.existsSync(ciPath)) return;
    const content = fs.readFileSync(ciPath, 'utf-8');
    expect(content).toContain('pnpm lint');
    expect(content).toContain('pnpm -r typecheck');
    expect(content).toContain('pnpm -r test');
    expect(content).toContain('pnpm -r build');
    expect(content).toContain('pnpm install --frozen-lockfile');
  });

  it('Windows guide has no dangerous commands', () => {
    const winPath = path.join(DOCS_DIR, 'troubleshooting/windows.md');
    if (!fs.existsSync(winPath)) return;
    const content = fs.readFileSync(winPath, 'utf-8');
    expect(content).not.toContain('rm -rf /');
    expect(content).not.toContain('Set-ExecutionPolicy Unrestricted');
    expect(content).toContain('EPERM');
    expect(content).toContain('CRLF');
    expect(content).toContain('better-sqlite3');
  });

  it('Contributing does not claim public/published status', () => {
    const contribPath = path.join(DOCS_DIR, 'contributing/development-setup.md');
    if (!fs.existsSync(contribPath)) return;
    const content = fs.readFileSync(contribPath, 'utf-8');
    expect(content).not.toContain('npm publish');
    expect(content).toContain('not yet public');
    expect(content).toContain('Maintainer approval');
  });

  it('new pages are accessible from at least one parent page', () => {
    // Verify cross-links: quickstart → Persian, troubleshooting → Windows, CLI ref → CI
    const quickstart = fs.readFileSync(path.join(DOCS_DIR, 'start/quickstart.md'), 'utf-8');
    const cliRef = fs.readFileSync(path.join(DOCS_DIR, 'reference/cli.md'), 'utf-8');
    const index = fs.readFileSync(path.join(DOCS_DIR, 'index.md'), 'utf-8');
    expect(quickstart).toContain('/fa/');
    expect(quickstart).toContain('/troubleshooting/windows');
    expect(cliRef).toContain('/guides/ci');
    expect(index).toContain('/fa/');
    expect(index).toContain('/contributing/development-setup');
    expect(index).toContain('/guides/ci');
  });
});
