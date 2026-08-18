import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ProjectFactoryError } from '@projectforge/schemas';
import {
  acquireTransactionLock,
  releaseTransactionLock,
  readTransactionLock,
} from './transaction-lock.js';
import type { FileSystemAdapter } from './interfaces.js';

function createFsAdapter(): FileSystemAdapter {
  return {
    readFile: async (p) => new Uint8Array(await fs.promises.readFile(p)),
    writeFile: async (p, content) => fs.promises.writeFile(p, content),
    exists: async (p) => fs.promises.access(p).then(() => true).catch(() => false),
    mkdir: async (p) => {
      await fs.promises.mkdir(p, { recursive: true });
    },
    rm: async (p) => fs.promises.rm(p, { recursive: true, force: true }),
  };
}

describe('transaction-lock', () => {
  let tmpDir: string;
  let fsAdapter: FileSystemAdapter;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-tx-lock-'));
    fsAdapter = createFsAdapter();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('acquires and releases a lock', async () => {
    const lock = await acquireTransactionLock(tmpDir, fsAdapter, { command: 'create' });
    expect(lock.pid).toBe(process.pid);
    expect(lock.command).toBe('create');
    expect(lock.projectRoot).toBe(tmpDir);

    const read = await readTransactionLock(tmpDir, fsAdapter);
    expect(read).not.toBeNull();
    expect(read!.pid).toBe(process.pid);

    await releaseTransactionLock(tmpDir, fsAdapter);
    expect(await fsAdapter.exists(path.join(tmpDir, '.projectforge', 'transaction.lock'))).toBe(false);
  });

  it('throws PF_PROJECT_LOCKED when an active lock is held', async () => {
    await acquireTransactionLock(tmpDir, fsAdapter, { command: 'create' });
    await expect(acquireTransactionLock(tmpDir, fsAdapter, { command: 'sync' })).rejects.toMatchObject({
      code: 'PF_PROJECT_LOCKED',
    });
  });

  it('recovers a stale lock from a dead process', async () => {
    const lockDir = path.join(tmpDir, '.projectforge');
    fs.mkdirSync(lockDir, { recursive: true });
    fs.writeFileSync(
      path.join(lockDir, 'transaction.lock'),
      JSON.stringify({ pid: 999_999, startedAt: new Date(Date.now() - 60_000).toISOString(), command: 'old' }) + '\n'
    );

    const lock = await acquireTransactionLock(tmpDir, fsAdapter, { command: 'sync' });
    expect(lock.pid).toBe(process.pid);
    expect(lock.command).toBe('sync');
  });

  it('treats a same-process lock as active even if staleAfter is not set', async () => {
    // Same PID with a very old timestamp should still be considered active
    // because the process is alive.
    const lockDir = path.join(tmpDir, '.projectforge');
    fs.mkdirSync(lockDir, { recursive: true });
    fs.writeFileSync(
      path.join(lockDir, 'transaction.lock'),
      JSON.stringify({ pid: process.pid, startedAt: new Date(Date.now() - 10_000).toISOString(), command: 'old' }) + '\n'
    );

    await expect(acquireTransactionLock(tmpDir, fsAdapter, { command: 'sync' })).rejects.toThrow(
      ProjectFactoryError
    );
  });

  it('does not store sensitive values in lock metadata', async () => {
    await acquireTransactionLock(tmpDir, fsAdapter, { command: 'create' });
    const raw = fs.readFileSync(path.join(tmpDir, '.projectforge', 'transaction.lock'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(Object.keys(parsed).sort()).toEqual(['command', 'pid', 'startedAt']);
    expect(raw).not.toContain('password');
    expect(raw).not.toContain('secret');
  });
});
