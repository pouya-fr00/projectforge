import path from 'node:path';
import type { FileSystemAdapter } from './interfaces.js';
import { ProjectFactoryError } from './errors.js';

export interface TransactionLock {
  pid: number;
  startedAt: string;
  command: string;
  projectRoot: string;
}

interface LockFileContent {
  pid: number;
  startedAt: string;
  command: string;
}

export const TransactionLockErrorCodes = {
  PROJECT_LOCKED: 'PF_PROJECT_LOCKED',
} as const;

function lockPath(projectRoot: string): string {
  return path.join(projectRoot, '.projectforge', 'transaction.lock');
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function readTransactionLock(
  projectRoot: string,
  fs: FileSystemAdapter
): Promise<TransactionLock | null> {
  const lockFile = lockPath(projectRoot);
  if (!(await fs.exists(lockFile))) {
    return null;
  }
  try {
    const raw = new TextDecoder().decode(await fs.readFile(lockFile));
    const parsed = JSON.parse(raw) as LockFileContent;
    return {
      ...parsed,
      projectRoot,
    };
  } catch {
    return null;
  }
}

export interface AcquireLockOptions {
  command: string;
  /**
   * Maximum age in milliseconds after which a lock is considered stale if its
   * owning process is no longer alive. Default: 5 minutes.
   */
  staleAfterMs?: number;
}

export async function acquireTransactionLock(
  projectRoot: string,
  fs: FileSystemAdapter,
  options: AcquireLockOptions
): Promise<TransactionLock> {
  const lockFile = lockPath(projectRoot);
  const now = Date.now();
  const existing = await readTransactionLock(projectRoot, fs);

  if (existing) {
    const lockAge = now - new Date(existing.startedAt).getTime();
    const alive = isProcessAlive(existing.pid);
    if (alive && (options.staleAfterMs === undefined || lockAge < options.staleAfterMs)) {
      throw new ProjectFactoryError(
        TransactionLockErrorCodes.PROJECT_LOCKED,
        `project is locked by another process (pid: ${existing.pid}, command: ${existing.command})`,
        {
          pid: existing.pid,
          command: existing.command,
          startedAt: existing.startedAt,
        }
      );
    }
    // Lock is stale; best-effort remove before re-acquiring.
    try {
      await fs.rm(lockFile);
    } catch {
      // Ignore removal failure; we'll overwrite below.
    }
  }

  const lock: TransactionLock = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    command: options.command,
    projectRoot,
  };

  const content = JSON.stringify(
    {
      pid: lock.pid,
      startedAt: lock.startedAt,
      command: lock.command,
    },
    null,
    2
  );

  await fs.mkdir(path.dirname(lockFile));
  await fs.writeFile(lockFile, new TextEncoder().encode(content));
  return lock;
}

export async function releaseTransactionLock(
  projectRoot: string,
  fs: FileSystemAdapter
): Promise<void> {
  const lockFile = lockPath(projectRoot);
  if (await fs.exists(lockFile)) {
    await fs.rm(lockFile);
  }
}
