import path from 'node:path';
import type { Plan, FileOperation, PackageOperation } from './planner.js';
import type { FileSystemAdapter, ProcessAdapter } from './interfaces.js';
import { ProjectFactoryError, EngineErrors } from './errors.js';
import type { PackageManagerAdapter } from './package-manager.js';
import { acquireTransactionLock, releaseTransactionLock } from './transaction-lock.js';
import { parseLock } from './lock.js';
import { hashBytes } from './checksum.js';
import type { FileProvenance } from '@projectforge/schemas';

function toNormalizedPath(...segments: string[]): string {
  return path.join(...segments).replace(/\\/g, '/');
}

export const ExecutorErrorCodes = {
  EXECUTION_FAILED: 'PF_EXECUTION_FAILED',
  ROLLBACK_FAILED: 'PF_ROLLBACK_FAILED',
  VERIFICATION_FAILED: 'PF_VERIFICATION_FAILED',
} as const;

export interface InstalledPackageRecord {
  name: string;
  targetManifest: string;
}

export interface ExecutorResult {
  success: boolean;
  appliedFiles: string[];
  installedPackages: InstalledPackageRecord[];
  backups: Map<string, string>;
  errors: string[];
  errorCode?: string;
  errorDetails?: Record<string, unknown>;
  recoveryReportPath?: string;
  checksums: Record<string, string>;
  provenance: Record<string, FileProvenance>;
}

export interface ExecutorOptions {
  plan: Plan;
  projectRoot: string;
  fs: FileSystemAdapter;
  process: ProcessAdapter;
  packageManager: PackageManagerAdapter;
  dryRun?: boolean;
  noInstall?: boolean;
  command?: string;
}

function isFailureInjected(point: 'write' | 'manifest' | 'install' | 'rollback'): boolean {
  const env = process.env;
  if (point === 'rollback') {
    return env.NODE_ENV === 'test' && env.PF_FAILURE_INJECT_ROLLBACK === '1';
  }
  if (point === 'write') {
    return env.NODE_ENV === 'test' && env.PF_FAILURE_AFTER_N_WRITES !== undefined;
  }
  if (point === 'manifest') {
    return env.NODE_ENV === 'test' && env.PF_FAILURE_AFTER_MANIFEST === '1';
  }
  if (point === 'install') {
    return env.NODE_ENV === 'test' && env.PF_FAILURE_AFTER_INSTALL === '1';
  }
  return false;
}

function assertWriteFailureAfterN(n: number): void {
  const env = process.env.PF_FAILURE_AFTER_N_WRITES;
  if (env === undefined) return;
  const limit = Number.parseInt(env, 10);
  if (Number.isNaN(limit)) return;
  if (n >= limit) {
    throw new ProjectFactoryError(
      ExecutorErrorCodes.EXECUTION_FAILED,
      `failure injected after ${n} file write(s)`,
      { injectedAt: 'write', count: n }
    );
  }
}

export class TransactionExecutor {
  private readonly backups = new Map<string, string>();
  private readonly createdFiles: string[] = [];
  private readonly appliedFiles: string[] = [];
  private readonly installedPackages: InstalledPackageRecord[] = [];
  private readonly checksums: Record<string, string> = {};
  private readonly provenance: Record<string, FileProvenance> = {};
  private backupCounter = 0;

  constructor(
    private readonly options: ExecutorOptions
  ) {}

  async execute(): Promise<ExecutorResult> {
    const { plan, projectRoot, fs, dryRun, noInstall } = this.options;

    try {
      // Preflight integrity check: compare existing managed files with the lock
      // before any mutation. Runs for both dry-run and real execution.
      await this.assertIntegrity(projectRoot, fs, plan.fileOperations);

      if (dryRun) {
        // Compute the provenance that would be persisted without writing anything.
        for (const op of plan.fileOperations) {
          if (op.kind === 'remove') continue;
          const bytes = await this.computeFileBytes(op, fs);
          const normalizedTarget = op.targetPath.replace(/\\/g, '/');
          this.recordProvenance(normalizedTarget, bytes, op.provenance);
        }
        return {
          success: true,
          appliedFiles: [],
          installedPackages: [],
          backups: new Map(),
          errors: [],
          checksums: { ...this.checksums },
          provenance: { ...this.provenance },
        };
      }

      let writeCount = 0;
      for (const op of plan.fileOperations) {
        await this.applyFileOperation(projectRoot, op, fs);
        writeCount += 1;
        assertWriteFailureAfterN(writeCount);
      }

      // Package operations: add/addDev always process (declare deps even with
      // --no-install), but install and remove are skipped when noInstall.
      for (const op of plan.packageOperations) {
        if (op.kind === 'add' || op.kind === 'addDev') {
          if (noInstall) {
            await this.declareDependency(projectRoot, op, fs);
          } else {
            await this.applyPackageOperation(projectRoot, op, this.options.packageManager);
          }
        } else if (!noInstall) {
          await this.applyPackageOperation(projectRoot, op, this.options.packageManager);
          if (op.kind === 'install' && isFailureInjected('install')) {
            throw new ProjectFactoryError(
              ExecutorErrorCodes.EXECUTION_FAILED,
              'failure injected after package install',
              { injectedAt: 'install' }
            );
          }
        }
      }

      // Verification commands depend on installed dependencies being present,
      // so they are skipped entirely when --no-install is active.
      if (!noInstall) {
        for (const command of plan.verificationCommands) {
          const [cmd, ...args] = command.split(/\s+/);
          const result = await this.options.process.exec(cmd, args, projectRoot);
          if (result.exitCode !== 0) {
            throw new ProjectFactoryError(
              ExecutorErrorCodes.VERIFICATION_FAILED,
              `verification command failed: ${command}`,
              { command, stderr: result.stderr }
            );
          }
        }
      }

      // Successful execution: remove backup artifacts so no transaction residue remains.
      for (const backupPath of this.backups.values()) {
        try {
          await fs.rm(backupPath);
        } catch {
          // Best-effort cleanup; a leftover backup is not worth failing the operation.
        }
      }

      return {
        success: true,
        appliedFiles: [...this.appliedFiles],
        installedPackages: [...this.installedPackages],
        backups: new Map(this.backups),
        errors: [],
        checksums: { ...this.checksums },
        provenance: { ...this.provenance },
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const rollbackErrors: string[] = [];
      try {
        await this.rollback(fs);
      } catch (rollbackErr) {
        rollbackErrors.push((rollbackErr as Error).message);
      }

      let recoveryReportPath: string | undefined;
      if (rollbackErrors.length > 0) {
        try {
          recoveryReportPath = await this.writeRecoveryReport(fs, error, rollbackErrors);
        } catch {
          // Best-effort: if we cannot write a recovery report, continue reporting the original failure.
        }
      }

      const errorCode =
        rollbackErrors.length > 0
          ? ExecutorErrorCodes.ROLLBACK_FAILED
          : error instanceof ProjectFactoryError
            ? error.code
            : ExecutorErrorCodes.EXECUTION_FAILED;
      const errorDetails: Record<string, unknown> =
        error instanceof ProjectFactoryError ? { ...error.details } : { message: error.message };
      if (recoveryReportPath) {
        errorDetails.recoveryReportPath = recoveryReportPath;
      }
      return {
        success: false,
        appliedFiles: [...this.appliedFiles],
        installedPackages: [...this.installedPackages],
        backups: new Map(this.backups),
        errors: [error.message, ...rollbackErrors],
        errorCode,
        errorDetails,
        recoveryReportPath,
        checksums: { ...this.checksums },
        provenance: { ...this.provenance },
      };
    }
  }

  private async assertIntegrity(
    projectRoot: string,
    fs: FileSystemAdapter,
    fileOperations: FileOperation[]
  ): Promise<void> {
    const lockPath = toNormalizedPath(projectRoot, 'projectforge-lock.json');
    let lock: { generatedChecksums?: Record<string, string>; provenance?: Record<string, FileProvenance> } | undefined;
    try {
      if (!(await fs.exists(lockPath))) return;
      const raw = new TextDecoder().decode(await fs.readFile(lockPath));
      lock = parseLock(raw, lockPath);
    } catch {
      // If the lock is unreadable/invalid, skip the integrity check. The
      // operation will either create a new lock or fail later for other reasons.
      return;
    }
    if (!lock) return;

    for (const op of fileOperations) {
      const targetPath = toNormalizedPath(projectRoot, op.targetPath);
      if (!(await fs.exists(targetPath))) continue;

      const normalizedPath = op.targetPath.replace(/\\/g, '/');
      const provenance = lock.provenance?.[normalizedPath];
      const legacyChecksum = lock.generatedChecksums?.[normalizedPath];
      if (!provenance && !legacyChecksum) continue;

      // Legacy locks only stored `generatedChecksums`. Treat them as factory-generated
      // because they were produced by the starter/module factory before provenance existed.
      const ownership = provenance?.ownership ?? 'factory-generated';
      if (ownership !== 'factory-generated' && ownership !== 'module-managed') continue;

      const currentContent = await fs.readFile(targetPath);
      const currentSha = hashBytes(currentContent);
      const expectedSha = provenance?.sha256 ?? legacyChecksum;
      if (currentSha !== expectedSha) {
        throw new ProjectFactoryError(
          EngineErrors.USER_MODIFIED_MANAGED_FILE,
          `managed file has been modified by user: ${normalizedPath}`,
          {
            path: normalizedPath,
            ownership,
            ownerId: provenance?.ownerId,
            ownerVersion: provenance?.ownerVersion,
            expectedChecksum: expectedSha,
            actualChecksum: currentSha,
            suggestedAction: 'review the file and resolve the conflict before re-running the command',
          }
        );
      }
    }
  }

  private async backupFile(fs: FileSystemAdapter, targetPath: string): Promise<void> {
    const backupPath = this.generateBackupPath(targetPath);
    const content = await fs.readFile(targetPath);
    await fs.mkdir(path.dirname(backupPath));
    await fs.writeFile(backupPath, content);
    this.backups.set(targetPath, backupPath);
  }

  private async applyFileOperation(projectRoot: string, op: FileOperation, fs: FileSystemAdapter): Promise<void> {
    const targetPath = toNormalizedPath(projectRoot, op.targetPath);
    const existed = await fs.exists(targetPath);

    if (existed) {
      await this.backupFile(fs, targetPath);
    } else {
      this.createdFiles.push(targetPath);
    }

    if (op.kind === 'copy' || op.kind === 'render') {
      await fs.mkdir(path.dirname(targetPath));
      const bytes = await this.computeFileBytes(op, fs);
      await fs.writeFile(targetPath, bytes);
      this.appliedFiles.push(op.targetPath);
      const normalizedTarget = op.targetPath.replace(/\\/g, '/');
      this.recordProvenance(normalizedTarget, bytes, op.provenance);
      if (isFailureInjected('manifest') && path.posix.basename(normalizedTarget) === 'package.json') {
        throw new ProjectFactoryError(
          ExecutorErrorCodes.EXECUTION_FAILED,
          'failure injected after package manifest change',
          { injectedAt: 'manifest', targetPath: op.targetPath }
        );
      }
    } else if (op.kind === 'remove') {
      if (!existed) {
        throw new ProjectFactoryError(
          ExecutorErrorCodes.EXECUTION_FAILED,
          `cannot remove missing file: ${op.targetPath}`,
          { targetPath: op.targetPath }
        );
      }
      await fs.rm(targetPath);
    }
  }

  /**
   * Write a dependency declaration directly into the project's workspace
   * API package.json without calling the package manager.  Used by
   * --no-install to preserve dependency declarations so the project is
   * buildable after a manual `pnpm install`.
   *
   * Matches the pnpm workspace routing: when `apps/api/package.json`
   * exists, deps are written there (pnpm's --filter target).  Otherwise
   * they go to the root package.json.
   */
  private async declareDependency(
    projectRoot: string,
    op: PackageOperation,
    fs: FileSystemAdapter
  ): Promise<void> {
    // Use the operation's target manifest (set by Planner from module metadata).
    const pkgPath = toNormalizedPath(projectRoot, op.targetManifest);
    const rootPkgPath = toNormalizedPath(projectRoot, 'package.json');
    const resolvedPath = (await fs.exists(pkgPath)) ? pkgPath : rootPkgPath;

    if (!(await fs.exists(resolvedPath))) {
      throw new ProjectFactoryError(
        ExecutorErrorCodes.EXECUTION_FAILED,
        `cannot declare dependency: ${resolvedPath} not found`,
        { path: resolvedPath }
      );
    }

    const raw = new TextDecoder().decode(await fs.readFile(resolvedPath));
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const field = op.kind === 'addDev' ? 'devDependencies' : 'dependencies';
    const deps = (pkg[field] ?? {}) as Record<string, string>;

    // Determine version: use the operation's explicit version, or a safe
    // wildcard that the user will resolve with their next pnpm install.
    const version = op.version ?? '*';

    // Preserve an existing compatible declaration to keep the operation
    // idempotent.
    if (deps[op.name] && deps[op.name] !== version) {
      // Keep the existing version — the user may have pinned it manually.
    } else {
      deps[op.name] = version;
    }

    // Sort keys for deterministic serialization.
    const sorted: Record<string, string> = {};
    for (const key of Object.keys(deps).sort()) {
      sorted[key] = deps[key];
    }
    pkg[field] = sorted;

    const updated = JSON.stringify(pkg, null, 2) + '\n';
    await fs.writeFile(resolvedPath, new TextEncoder().encode(updated));      this.installedPackages.push({ name: op.name, targetManifest: op.targetManifest });
  }

  private async applyPackageOperation(
    projectRoot: string,
    op: PackageOperation,
    packageManager: PackageManagerAdapter
  ): Promise<void> {
    if (op.kind === 'install') {
      const result = await packageManager.install(projectRoot);
      if (result.exitCode !== 0) {
        throw new ProjectFactoryError(
          ExecutorErrorCodes.EXECUTION_FAILED,
          `package manager failed to install: ${result.stderr || result.stdout}`,
          { packageManager: packageManager.name, stderr: result.stderr, stdout: result.stdout }
        );
      }
    } else if (op.kind === 'add') {
      const result = await packageManager.add([op.name], projectRoot, op.targetManifest);
      if (result.exitCode !== 0) {
        throw new ProjectFactoryError(
          ExecutorErrorCodes.EXECUTION_FAILED,
          `package manager failed to add ${op.name}: ${result.stderr}`,
          { package: op.name, stderr: result.stderr }
        );
      }
      this.installedPackages.push({ name: op.name, targetManifest: op.targetManifest });
    } else if (op.kind === 'addDev') {
      const result = await packageManager.addDev([op.name], projectRoot, op.targetManifest);
      if (result.exitCode !== 0) {
        throw new ProjectFactoryError(
          ExecutorErrorCodes.EXECUTION_FAILED,
          `package manager failed to add dev ${op.name}: ${result.stderr}`,
          { package: op.name, stderr: result.stderr }
        );
      }
      this.installedPackages.push({ name: op.name, targetManifest: op.targetManifest });
    } else if (op.kind === 'remove') {
      const result = await packageManager.remove([op.name], projectRoot, op.targetManifest);
      if (result.exitCode !== 0) {
        throw new ProjectFactoryError(
          ExecutorErrorCodes.EXECUTION_FAILED,
          `package manager failed to remove ${op.name}: ${result.stderr}`,
          { package: op.name, stderr: result.stderr }
        );
      }
    }
  }

  private async rollback(fs: FileSystemAdapter): Promise<void> {
    // Test-only hook: simulate an unrecoverable rollback failure. Only active in
    // a test environment to avoid a production backdoor.
    if (process.env.NODE_ENV === 'test' && process.env.PF_FAILURE_INJECT_ROLLBACK === '1') {
      throw new ProjectFactoryError(ExecutorErrorCodes.ROLLBACK_FAILED, 'rollback failure injected for testing');
    }

    const errors: string[] = [];

    // Best-effort uninstall packages that were added before the failure.
    for (const pkg of this.installedPackages) {
      try {
        await this.options.packageManager.remove([pkg.name], this.options.projectRoot, pkg.targetManifest);
      } catch (e) {
        errors.push(`failed to remove installed package ${pkg.name}: ${(e as Error).message}`);
      }
    }

    for (const [originalPath, backupPath] of this.backups) {
      try {
        if (await fs.exists(backupPath)) {
          const content = await fs.readFile(backupPath);
          await fs.writeFile(originalPath, content);
          // Remove the backup file so no transaction artifacts remain.
          try {
            await fs.rm(backupPath);
          } catch {
            // Best-effort cleanup of the backup file.
          }
        }
      } catch (e) {
        errors.push(`failed to restore ${originalPath}: ${(e as Error).message}`);
      }
    }
    for (const createdPath of this.createdFiles) {
      try {
        if (await fs.exists(createdPath)) {
          await fs.rm(createdPath);
        }
      } catch (e) {
        errors.push(`failed to remove created file ${createdPath}: ${(e as Error).message}`);
      }
    }
    if (errors.length > 0) {
      throw new ProjectFactoryError(ExecutorErrorCodes.ROLLBACK_FAILED, errors.join('; '), { errors });
    }
  }

  private async computeFileBytes(op: FileOperation, fs: FileSystemAdapter): Promise<Uint8Array> {
    let content: string | undefined = op.content;
    if (!content && op.sourcePath) {
      content = new TextDecoder().decode(await fs.readFile(op.sourcePath));
    }
    if (op.kind === 'render' && op.variables) {
      content = content ?? '';
      for (const [key, value] of Object.entries(op.variables)) {
        content = content.replaceAll(`{{${key}}}`, value);
        content = content.replaceAll(`__${key}__`, value);
      }
    }
    return new TextEncoder().encode(content ?? '');
  }

  private recordProvenance(
    targetPath: string,
    content: Uint8Array,
    source?: { ownerId: string; ownerVersion: string; operation: string; classification: 'generated' | 'managed' | 'user' | 'extension' | 'unknown'; ownership: 'factory-generated' | 'module-managed' | 'user-owned' | 'extension-point' | 'unknown' }
  ): void {
    const sha256 = hashBytes(content);
    this.checksums[targetPath] = sha256;
    this.provenance[targetPath] = {
      path: targetPath,
      sha256,
      ownership: source?.ownership ?? 'unknown',
      ownerId: source?.ownerId ?? 'unknown',
      ownerVersion: source?.ownerVersion ?? 'unknown',
      operation: source?.operation ?? 'write',
      classification: source?.classification ?? 'unknown',
      schemaVersion: 1,
    };
  }

  private generateBackupPath(targetPath: string): string {
    this.backupCounter += 1;
    // Extract extension manually so the result is correct even when paths are
    // normalized to forward slashes on Windows. Dotfiles are treated as
    // extensionless, matching Node's path.extname behavior.
    const lastSep = Math.max(targetPath.lastIndexOf('/'), targetPath.lastIndexOf('\\'));
    const fileNameStart = lastSep + 1;
    const lastDot = targetPath.lastIndexOf('.');
    const hasExt = lastDot > fileNameStart;
    const ext = hasExt ? targetPath.slice(lastDot) : '';
    const base = hasExt ? targetPath.slice(0, lastDot) : targetPath;
    return toNormalizedPath(`${base}.backup-${this.backupCounter}${ext}`);
  }

  private async writeRecoveryReport(
    fs: FileSystemAdapter,
    originalError: Error,
    rollbackErrors: string[]
  ): Promise<string> {
    const projectRoot = this.options.projectRoot;
    const reportDir = toNormalizedPath(path.join(projectRoot, '.projectforge'));
    await fs.mkdir(reportDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = toNormalizedPath(path.join(reportDir, `recovery-report-${timestamp}.json`));

    const report = this.redactSecrets({
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      projectRoot,
      originalError: {
        code: (originalError as { code?: string }).code ?? 'UNKNOWN',
        message: originalError.message,
      },
      rollbackErrors,
      appliedFiles: this.appliedFiles,
      installedPackages: this.installedPackages,
      backups: Object.fromEntries(this.backups),
    });

    await fs.writeFile(reportPath, new TextEncoder().encode(JSON.stringify(report, null, 2) + '\n'));
    return reportPath;
  }

  private redactSecrets(value: unknown): unknown {
    if (typeof value === 'string') {
      // Redact common secret-like substrings and anything that looks like an
      // Authorization header or a private key.
      return value
        .replace(/(authorization\s*[:=]\s*(?:bearer\s+)?)(\S+)/gi, '$1[REDACTED]')
        .replace(/(password|secret|token|api[_-]?key|private[_-]?key|cookie|session|credential|auth)\s*[:=]\s*[^\s&]+/gi, '$1=[REDACTED]');
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.redactSecrets(v));
    }
    if (value !== null && typeof value === 'object') {
      const redacted: Record<string, unknown> = {};
      for (const [key, v] of Object.entries(value)) {
        // Fully redact the value of any secret-like key.
        if (/(password|secret|token|api[_-]?key|private[_-]?key|cookie|session|credential|auth)/i.test(key)) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.redactSecrets(v);
        }
      }
      return redacted;
    }
    return value;
  }
}

export async function executePlan(options: ExecutorOptions): Promise<ExecutorResult> {
  const { projectRoot, fs, dryRun } = options;
  if (dryRun) {
    const executor = new TransactionExecutor(options);
    return executor.execute();
  }

  await acquireTransactionLock(projectRoot, fs, { command: options.command ?? 'unknown' });
  try {
    const executor = new TransactionExecutor(options);
    return await executor.execute();
  } finally {
    try {
      await releaseTransactionLock(projectRoot, fs);
    } catch {
      // Best-effort cleanup; do not mask the real execution result.
    }
  }
}
