import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCli, parseEnvelope } from './integration-helpers.js';

async function createProject(tmp: string): Promise<string> {
  const { exitCode } = await runCli(['--no-install', 'create', 'locked-app', 'default'], tmp);
  if (exitCode !== 0) {
    throw new Error(`Failed to seed project in ${tmp}: exit ${exitCode}`);
  }
  return path.join(tmp, 'locked-app');
}

function writeLock(projectRoot: string, pid: number, startedAt: string) {
  const lockDir = path.join(projectRoot, '.projectforge');
  fs.mkdirSync(lockDir, { recursive: true });
  fs.writeFileSync(
    path.join(lockDir, 'transaction.lock'),
    JSON.stringify({ pid, startedAt, command: 'sync' }, null, 2) + '\n'
  );
}

describe('projectforge transaction lock', () => {
  it('fails with PF_PROJECT_LOCKED when another active lock exists', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-lock-active-'));
    try {
      const projectRoot = await createProject(tmp);
      // Use the current process PID as the active lock holder.
      writeLock(projectRoot, process.pid, new Date().toISOString());
      const { exitCode, stdout } = await runCli(['--json', 'sync'], projectRoot);
      expect(exitCode).toBe(1);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(false);
      expect(envelope.errors[0].code).toBe('PF_PROJECT_LOCKED');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('recovers a stale lock and succeeds', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-lock-stale-'));
    try {
      const projectRoot = await createProject(tmp);
      // Use a clearly dead PID and an old timestamp.
      writeLock(projectRoot, 999_999, new Date(Date.now() - 60_000).toISOString());
      const { exitCode, stdout } = await runCli(['--json', 'sync'], projectRoot);
      expect(exitCode).toBe(0);
      const envelope = parseEnvelope(stdout);
      expect(envelope.ok).toBe(true);
      // Lock file should be cleaned up after a successful command.
      expect(fs.existsSync(path.join(projectRoot, '.projectforge', 'transaction.lock'))).toBe(false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
