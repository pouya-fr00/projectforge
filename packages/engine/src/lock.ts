import fs from 'node:fs';
import path from 'node:path';
import type { ProjectLock, InstalledModule } from '@projectforge/schemas';
import { validateProjectLock } from '@projectforge/schemas';
import { ProjectFactoryError } from './errors.js';

export const LockErrorCodes = {
  LOCK_READ_FAILED: 'PF_LOCK_READ_FAILED',
  LOCK_WRITE_FAILED: 'PF_LOCK_WRITE_FAILED',
  LOCK_INVALID: 'PF_LOCK_INVALID',
} as const;

export const LOCK_FILE_NAME = 'projectforge-lock.json';

export function parseLock(raw: string, lockPath?: string): ProjectLock {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new ProjectFactoryError(
      LockErrorCodes.LOCK_INVALID,
      `invalid JSON in lock file: ${lockPath ?? LOCK_FILE_NAME}`,
      { path: lockPath ?? LOCK_FILE_NAME, cause: (e as Error).message }
    );
  }

  try {
    validateProjectLock(parsed);
  } catch (err) {
    throw new ProjectFactoryError(
      LockErrorCodes.LOCK_INVALID,
      `invalid lock file: ${lockPath ?? LOCK_FILE_NAME}`,
      { path: lockPath ?? LOCK_FILE_NAME, cause: (err as Error).message }
    );
  }

  return parsed as ProjectLock;
}

export function readLock(projectRoot: string): ProjectLock | undefined {
  const lockPath = path.join(projectRoot, LOCK_FILE_NAME);
  if (!fs.existsSync(lockPath)) {
    return undefined;
  }

  let raw: string;
  try {
    raw = fs.readFileSync(lockPath, 'utf-8');
  } catch (e) {
    throw new ProjectFactoryError(
      LockErrorCodes.LOCK_READ_FAILED,
      `cannot read lock file: ${lockPath}`,
      { path: lockPath, cause: (e as Error).message }
    );
  }

  return parseLock(raw, lockPath);
}

export function writeLock(projectRoot: string, lock: ProjectLock): void {
  validateProjectLock(lock);
  const lockPath = path.join(projectRoot, LOCK_FILE_NAME);
  try {
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  } catch (e) {
    throw new ProjectFactoryError(
      LockErrorCodes.LOCK_WRITE_FAILED,
      `cannot write lock file: ${lockPath}`,
      { path: lockPath, cause: (e as Error).message }
    );
  }
}

export const PLACEHOLDER_CHECKSUM = 'sha256-placeholder';

export function createInstalledModuleFromManifest(id: string, version: string): InstalledModule {
  return { id, version, checksum: PLACEHOLDER_CHECKSUM };
}
