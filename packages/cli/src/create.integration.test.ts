import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCli, parseEnvelope } from './integration-helpers.js';

describe('projectforge create clean-room', () => {
  it('creates a project with --no-install and writes files', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-create-'));
    try {
      const target = path.join(tmp, 'my-app');
      const { exitCode, stdout } = await runCli(['--no-install', '--json', 'create', 'my-app', 'default'], tmp);
      expect(exitCode).toBe(0);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(true);
      expect(fs.existsSync(path.join(target, 'projectforge.json'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'projectforge-lock.json'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'pnpm-workspace.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'apps', 'web', 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(target, 'apps', 'api', 'src', 'index.ts'))).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('dry-run does not create files', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-dry-'));
    try {
      const target = path.join(tmp, 'my-app');
      const { exitCode, stdout } = await runCli(['--dry-run', '--json', 'create', 'my-app', 'default'], tmp);
      expect(exitCode).toBe(0);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(true);
      expect(fs.existsSync(target)).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects a non-empty target directory', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-existing-'));
    try {
      const target = path.join(tmp, 'my-app');
      fs.mkdirSync(target, { recursive: true });
      fs.writeFileSync(path.join(target, 'existing.txt'), 'hello');
      const { exitCode, stdout } = await runCli(['--json', 'create', 'my-app', 'default'], tmp);
      expect(exitCode).toBe(1);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects path traversal in project name', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-traversal-'));
    try {
      const { exitCode, stdout } = await runCli(['--json', 'create', '../escape', 'default'], tmp);
      expect(exitCode).toBe(1);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('rejects missing project name', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-missing-'));
    try {
      const { exitCode } = await runCli(['--json', 'create'], tmp);
      expect(exitCode).toBe(2);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('replaces project name placeholders', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-render-'));
    try {
      const target = path.join(tmp, 'acme-corp');
      await runCli(['--no-install', 'create', 'acme-corp', 'default'], tmp);
      const html = fs.readFileSync(path.join(target, 'apps', 'web', 'index.html'), 'utf-8');
      expect(html).toContain('acme-corp');
      const readme = fs.readFileSync(path.join(target, 'README.md'), 'utf-8');
      expect(readme).toContain('acme-corp');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('interpolates an arbitrary project name into Web branding', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-brand-'));
    try {
      const name = 'project-name-regression-app';
      const target = path.join(tmp, name);
      const { exitCode } = await runCli(['--no-install', '--json', 'create', name, 'default'], tmp);
      expect(exitCode).toBe(0);

      const header = fs.readFileSync(
        path.join(target, 'apps', 'web', 'src', 'components', 'Header.tsx'),
        'utf-8',
      );
      expect(header).toContain(name);
      expect(header).not.toContain('final-my-app');

      const home = fs.readFileSync(
        path.join(target, 'apps', 'web', 'src', 'pages', 'Home.tsx'),
        'utf-8',
      );
      expect(home).toContain(`Welcome to ${name}`);
      expect(home).not.toContain('final-my-app');

      const html = fs.readFileSync(path.join(target, 'apps', 'web', 'index.html'), 'utf-8');
      expect(html).toContain(name);

      const apiIndex = fs.readFileSync(path.join(target, 'apps', 'api', 'src', 'index.ts'), 'utf-8');
      expect(apiIndex).toContain(name);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('works from a path containing spaces', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf space '));
    try {
      const target = path.join(tmp, 'my app');
      const { exitCode, stdout } = await runCli(['--no-install', '--json', 'create', 'my app', 'default'], tmp);
      expect(exitCode).toBe(0);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(true);
      expect(fs.existsSync(path.join(target, 'projectforge.json'))).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('projectforge upgrade', () => {
  it('returns PF_NOT_IMPLEMENTED with exit code 2', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-upgrade-'));
    try {
      const { exitCode, stdout } = await runCli(['--json', 'upgrade', '--check'], tmp);
      expect(exitCode).toBe(2);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_NOT_IMPLEMENTED');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
