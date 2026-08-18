import fs from 'node:fs';
import path from 'node:path';
import type { ProjectConfig } from '@projectforge/schemas';
import { ProjectFactoryError } from '@projectforge/schemas';
import { resolveModuleGraph, createPlan, createStarterPlan, executePlan, readLock, writeLock } from '@projectforge/engine';
import { readProjectConfig, writeProjectConfig, createProjectState } from '@projectforge/engine';
import { LocalRegistry } from '@projectforge/registry';
import type { Registry } from '@projectforge/registry';
import { detectPackageManager, createPackageManagerAdapter } from '@projectforge/engine';
import { resolveSafePath } from '@projectforge/engine';
import { hashString } from '@projectforge/engine';
import { ENGINE_VERSION } from '@projectforge/engine';
import type { FileSystemAdapter, ProcessAdapter, Plan, ExecutorResult } from '@projectforge/engine';
import { mapErrorToExitCode } from './exit.js';
import type { Output } from './output.js';

export interface CommandContext {
  args: string[];
  cwd: string;
  json: boolean;
  noColor: boolean;
  verbose: boolean;
  dryRun: boolean;
  noInstall: boolean;
  out: Output;
  registryPath: string;

}

export type Command = (ctx: CommandContext) => Promise<number>;

function createNodeAdapters(): { fs: FileSystemAdapter; process: ProcessAdapter } {
  return {
    fs: {
      readFile: (p) => fs.promises.readFile(p),
      writeFile: (p, content) => fs.promises.writeFile(p, content),
      exists: (p) => fs.promises.access(p).then(() => true).catch(() => false),
      mkdir: async (p) => {
        await fs.promises.mkdir(p, { recursive: true });
      },
      rm: (p) => fs.promises.rm(p, { recursive: true, force: true }),
    },
    process: {
      exec: async (command, args, cwd) => {
        const { execFile } = await import('node:child_process');
        // Only use the shell on Windows for known package-manager wrappers. This
        // avoids shell injection for arbitrary verification commands while still
        // allowing pnpm/npm/yarn to be located on Windows (they are .cmd files).
        const needsShell = process.platform === 'win32' && ['pnpm', 'npm', 'yarn', 'npx'].includes(command);
        return new Promise((resolve) => {
          execFile(command, args, { cwd, shell: needsShell }, (error, stdout, stderr) => {
            if (error) {
              const code = typeof error.code === 'number' ? error.code : 1;
              resolve({ exitCode: code, stdout, stderr: stderr || String(error.message) });
            } else {
              resolve({ exitCode: 0, stdout, stderr });
            }
          });
        });
      },
    },
  };
}

const CLI_ERROR_CODES = {
  NOT_A_PROJECT: 'PF_NOT_A_PROJECT',
  PROJECT_EXISTS: 'PF_PROJECT_EXISTS',
  STARTER_NOT_FOUND: 'PF_STARTER_NOT_FOUND',
  MISSING_ARGUMENT: 'PF_MISSING_ARGUMENT',
  EXECUTION_FAILED: 'PF_EXECUTION_FAILED',
  NOT_IMPLEMENTED: 'PF_NOT_IMPLEMENTED',
} as const;

function loadRegistry(registryPath: string) {
  const registry = new LocalRegistry({ registryPath });
  registry.load();
  return registry;
}

function requireProject(projectRoot: string): void {
  if (!fs.existsSync(path.join(projectRoot, 'projectforge.json'))) {
    throw new ProjectFactoryError(
      CLI_ERROR_CODES.NOT_A_PROJECT,
      `not a projectforge project: ${projectRoot}`,
      { projectRoot }
    );
  }
}

function validateProjectName(name: string, cwd: string): { valid: true; projectRoot: string } | { valid: false; reason: string } {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '.' || trimmed === '..') {
    return { valid: false, reason: 'project name cannot be ".", "..", or empty' };
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return { valid: false, reason: 'project name cannot contain path separators' };
  }
  try {
    const safe = resolveSafePath(cwd, trimmed);
    return { valid: true, projectRoot: safe.absolute };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid project name';
    return { valid: false, reason: message };
  }
}

function executionErrorFromResult(result: ExecutorResult): ProjectFactoryError {
  const code = result.errorCode ?? CLI_ERROR_CODES.EXECUTION_FAILED;
  return new ProjectFactoryError(code, result.errors.join('; '), result.errorDetails ?? {});
}

function buildPlan(ctx: CommandContext, requested?: string[], registry = loadRegistry(ctx.registryPath), includeInstalled = false) {
  const projectRoot = ctx.cwd;
  const config = readProjectConfig(projectRoot);
  // For `add`, plan against the union of already-installed modules and the
  // newly requested ones. The generated route/feature aggregators are derived
  // from the resolved set, so without the union every `add` would rewrite the
  // aggregators with ONLY the newly added module's routes, clobbering the
  // routes contributed by previously installed modules.
  const req =
    requested && requested.length > 0
      ? includeInstalled
        ? [...new Set([...config.modules, ...requested])]
        : requested
      : config.modules;
  const state = createProjectState(projectRoot, config, includeInstalled ? config.modules : []);
  const resolved = resolveModuleGraph({ requested: req, getModule: (id) => registry.getModule(id) });
  return { plan: createPlan({ state, requested: req, resolved, registryPath: ctx.registryPath }), config, registry };
}

function fileChecksum(registryPath: string, ...segments: string[]): string {
  const filePath = path.join(registryPath, ...segments);
  const content = fs.readFileSync(filePath, 'utf-8');
  return hashString(content);
}

function installedModuleEntry(id: string, registry: Registry, registryPath: string) {
  const manifest = registry.getModule(id);
  const checksum = fileChecksum(registryPath, 'modules', `${id}.json`);
  return { id, version: manifest?.version ?? '0.1.0', checksum };
}

function renderPlanSummary(plan: Plan): string {
  return `Plan ${plan.planId}: ${plan.dependencyOrder.join(' -> ')} | ${plan.fileOperations.length} file ops | ${plan.packageOperations.length} pkg ops`;
}

export const commands: Record<string, Command> = {
  async create(ctx) {
    const [name, starterArg] = ctx.args;
    const starterId = starterArg ?? 'default';

    if (!name) {
      ctx.out.error(new ProjectFactoryError(CLI_ERROR_CODES.MISSING_ARGUMENT, 'usage: projectforge create <name> [starter]'));
      return 2;
    }

    const nameValidation = validateProjectName(name, ctx.cwd);
    if (!nameValidation.valid) {
      const err = new ProjectFactoryError('PF_INVALID_PATH', nameValidation.reason, { name });
      ctx.out.error(err);
      return mapErrorToExitCode(err).exitCode;
    }

    const projectName = name.trim();
    const projectRoot = nameValidation.projectRoot;

    if (fs.existsSync(projectRoot)) {
      const existing = fs.readdirSync(projectRoot);
      if (existing.length > 0) {
        ctx.out.error(new ProjectFactoryError(CLI_ERROR_CODES.PROJECT_EXISTS, `target directory is not empty: ${projectRoot}`));
        return 1;
      }
    }

    const registry = loadRegistry(ctx.registryPath);
    const starter = registry.getStarter(starterId);
    if (!starter) {
      ctx.out.error(new ProjectFactoryError(CLI_ERROR_CODES.STARTER_NOT_FOUND, `starter not found: ${starterId}`));
      return 1;
    }

    const plan = createStarterPlan({ starter, projectRoot, projectName });

    const config: ProjectConfig = {
      schemaVersion: 1,
      name: projectName,
      starter: starterId,
      modules: [],
    };

    const lock = {
      schemaVersion: 1,
      engineVersion: ENGINE_VERSION,
      starter: { id: starterId, version: starter.version, checksum: fileChecksum(ctx.registryPath, 'starters', `${starterId}.json`) },
      modules: [],
      generatedChecksums: {},
      provenance: {},
      timestamp: new Date().toISOString(),
    };

    plan.fileOperations.push({
      kind: 'render',
      targetPath: 'projectforge.json',
      content: JSON.stringify(config, null, 2) + '\n',
      provenance: {
        ownerId: starterId,
        ownerVersion: starter.version,
        operation: 'render',
        classification: 'generated',
        ownership: 'factory-generated',
      },
    });
    plan.fileOperations.push({
      kind: 'render',
      targetPath: 'projectforge-lock.json',
      content: JSON.stringify(lock, null, 2) + '\n',
      provenance: {
        ownerId: starterId,
        ownerVersion: starter.version,
        operation: 'render',
        classification: 'generated',
        ownership: 'factory-generated',
      },
    });

    if (ctx.dryRun) {
      ctx.out.json({ created: false, name: projectName, starter: starterId, projectRoot, dryRun: true, plan });
      ctx.out.print(`Dry-run: would create project "${projectName}" with starter "${starterId}" at ${projectRoot}`);
      ctx.out.print(renderPlanSummary(plan));
      return 0;
    }

    const createdRoot = !fs.existsSync(projectRoot);
    if (createdRoot) {
      fs.mkdirSync(projectRoot, { recursive: true });
    }

    const { fs: fsAdapter, process } = createNodeAdapters();
    const pmName = detectPackageManager(projectRoot);
    const packageManager = createPackageManagerAdapter(pmName, process);

    const result = await executePlan({
      plan,
      projectRoot,
      fs: fsAdapter,
      process,
      packageManager,
      noInstall: ctx.noInstall,
      command: 'create',
    });

    if (!result.success) {
      const err = executionErrorFromResult(result);
      ctx.out.error(err);
      const rollbackFailed = result.errorCode === 'PF_ROLLBACK_FAILED';
      if (result.recoveryReportPath) {
        ctx.out.print(`Recovery report written to: ${result.recoveryReportPath}`);
      }
      // Preserve the project directory when rollback fails so the recovery
      // report and any partial state remain available for inspection.
      if (createdRoot && !rollbackFailed) {
        try {
          fs.rmSync(projectRoot, { recursive: true, force: true });
        } catch {
          // best-effort cleanup
        }
      }
      return mapErrorToExitCode(err).exitCode;
    }

    // Persist generated file checksums and provenance in the lock.
    lock.generatedChecksums = { ...lock.generatedChecksums, ...result.checksums };
    lock.provenance = { ...lock.provenance, ...result.provenance };
    writeLock(projectRoot, lock);

    ctx.out.print(`Created project "${projectName}" with starter "${starterId}" at ${projectRoot}`);
    return 0;
  },

  async add(ctx) {
    const requested = ctx.args.filter((a) => !a.startsWith('--'));
    if (requested.length === 0) {
      ctx.out.error(new ProjectFactoryError(CLI_ERROR_CODES.MISSING_ARGUMENT, 'usage: projectforge add <module...>'));
      return 2;
    }

    const projectRoot = ctx.cwd;
    requireProject(projectRoot);
    const { plan, config, registry } = buildPlan(ctx, requested, undefined, true);

    const { fs, process } = createNodeAdapters();
    const pmName = detectPackageManager(projectRoot);
    const packageManager = createPackageManagerAdapter(pmName, process);

    if (ctx.dryRun) {
      const result = await executePlan({
        plan,
        projectRoot,
        fs,
        process,
        packageManager,
        noInstall: ctx.noInstall,
        dryRun: true,
        command: 'add',
      });
      if (!result.success) {
        const err = executionErrorFromResult(result);
        ctx.out.error(err);
        return mapErrorToExitCode(err).exitCode;
      }
      ctx.out.json({ plan, dryRun: true });
      ctx.out.print(`Dry-run: ${renderPlanSummary(plan)}`);
      return 0;
    }

    ctx.out.print(`Planning to add modules: ${requested.join(', ')}`);

    const result = await executePlan({
      plan,
      projectRoot,
      fs,
      process,
      packageManager,
      noInstall: ctx.noInstall,
      command: 'add',
    });

    if (!result.success) {
      const err = executionErrorFromResult(result);
      ctx.out.error(err);
      return mapErrorToExitCode(err).exitCode;
    }

    const newModules = [...new Set([...config.modules, ...plan.dependencyOrder])];
    config.modules = newModules;
    writeProjectConfig(projectRoot, config);

    const existingLock = readLock(projectRoot);
    const previousModules = new Map(existingLock?.modules.map((m) => [m.id, m]) ?? []);
    for (const id of plan.dependencyOrder) {
      previousModules.set(id, installedModuleEntry(id, registry, ctx.registryPath));
    }
    const starterVersion =
      existingLock?.starter.version ??
      registry.getStarter(config.starter)?.version ??
      '0.1.0';
    const starterChecksum = existingLock?.starter.checksum ??
      fileChecksum(ctx.registryPath, 'starters', `${config.starter}.json`);
    const lock = {
      schemaVersion: 1,
      engineVersion: ENGINE_VERSION,
      starter: { id: config.starter, version: starterVersion, checksum: starterChecksum },
      modules: [...previousModules.values()],
      generatedChecksums: { ...(existingLock?.generatedChecksums ?? {}), ...result.checksums },
      provenance: { ...(existingLock?.provenance ?? {}), ...result.provenance },
      timestamp: new Date().toISOString(),
    };
    writeLock(projectRoot, lock);

    ctx.out.print(`Added modules: ${requested.join(', ')}`);
    return 0;
  },

  async sync(ctx) {
    const projectRoot = ctx.cwd;
    requireProject(projectRoot);
    const { plan, config, registry } = buildPlan(ctx);

    const { fs, process } = createNodeAdapters();
    const pmName = detectPackageManager(projectRoot);
    const packageManager = createPackageManagerAdapter(pmName, process);

    if (ctx.dryRun) {
      const result = await executePlan({
        plan,
        projectRoot,
        fs,
        process,
        packageManager,
        noInstall: ctx.noInstall,
        dryRun: true,
        command: 'sync',
      });
      if (!result.success) {
        const err = executionErrorFromResult(result);
        ctx.out.error(err);
        return mapErrorToExitCode(err).exitCode;
      }
      ctx.out.json({ plan, dryRun: true });
      ctx.out.print(`Dry-run: ${renderPlanSummary(plan)}`);
      return 0;
    }

    const result = await executePlan({
      plan,
      projectRoot,
      fs,
      process,
      packageManager,
      noInstall: ctx.noInstall,
      command: 'sync',
    });

    if (!result.success) {
      const err = executionErrorFromResult(result);
      ctx.out.error(err);
      return mapErrorToExitCode(err).exitCode;
    }

    const existingLock = readLock(projectRoot);
    const starterVersion =
      existingLock?.starter.version ??
      registry.getStarter(config.starter)?.version ??
      '0.1.0';
    const syncedModules = new Map<string, ReturnType<typeof installedModuleEntry>>();
    for (const id of config.modules) {
      syncedModules.set(id, installedModuleEntry(id, registry, ctx.registryPath));
    }
    const starterChecksum = existingLock?.starter.checksum ??
      fileChecksum(ctx.registryPath, 'starters', `${config.starter}.json`);
    const lock = {
      schemaVersion: 1,
      engineVersion: ENGINE_VERSION,
      starter: { id: config.starter, version: starterVersion, checksum: starterChecksum },
      modules: [...syncedModules.values()],
      generatedChecksums: { ...(existingLock?.generatedChecksums ?? {}), ...result.checksums },
      provenance: { ...(existingLock?.provenance ?? {}), ...result.provenance },
      timestamp: new Date().toISOString(),
    };
    writeLock(projectRoot, lock);

    ctx.out.print(`Synced project with modules: ${config.modules.join(', ')}`);
    return 0;
  },

  async status(ctx) {
    const projectRoot = ctx.cwd;
    requireProject(projectRoot);
    const config = readProjectConfig(projectRoot);
    const lock = readLock(projectRoot);

    if (ctx.json) {
      ctx.out.json({
        name: config.name,
        starter: config.starter,
        modules: config.modules,
        installedModules: lock?.modules.map((m) => m.id) ?? [],
      });
      return 0;
    }

    ctx.out.print(`Project: ${config.name}`);
    ctx.out.print(`Starter: ${config.starter}`);
    ctx.out.print(`Modules in config: ${config.modules.join(', ') || '(none)'}`);
    ctx.out.print(`Installed modules: ${lock?.modules.map((m) => m.id).join(', ') || '(none)'}`);
    return 0;
  },

  async doctor(ctx) {
    const projectRoot = ctx.cwd;
    const issues: string[] = [];

    if (!fs.existsSync(path.join(projectRoot, 'projectforge.json'))) {
      issues.push('missing projectforge.json');
    }
    if (!fs.existsSync(path.join(projectRoot, 'projectforge-lock.json'))) {
      issues.push('missing projectforge-lock.json');
    }

    try {
      const registry = loadRegistry(ctx.registryPath);
      if (registry.listStarters().length === 0 && registry.listModules().length === 0) {
        issues.push('registry is empty');
      }
    } catch {
      issues.push('cannot load registry');
    }

    if (ctx.json) {
      ctx.out.json({ healthy: issues.length === 0, issues });
      return 0;
    }

    if (issues.length === 0) {
      ctx.out.print('Project looks healthy.');
    } else {
      ctx.out.print('Issues found:');
      for (const issue of issues) {
        ctx.out.print(`  - ${issue}`);
      }
    }
    return issues.length > 0 ? 1 : 0;
  },

  async plan(ctx) {
    requireProject(ctx.cwd);
    const requested = ctx.args.filter((a) => !a.startsWith('--'));
    const { plan } = buildPlan(ctx, requested);
    if (ctx.json) {
      ctx.out.json(plan);
    } else {
      ctx.out.print(`Plan: ${plan.planId}`);
      ctx.out.print(`Dependency order: ${plan.dependencyOrder.join(' -> ')}`);
      ctx.out.print(`File operations: ${plan.fileOperations.length}`);
      ctx.out.print(`Package operations: ${plan.packageOperations.length}`);
    }
    return 0;
  },

  async list(ctx) {
    const registry = loadRegistry(ctx.registryPath);
    const starters = registry.listStarters();
    const modules = registry.listModules();

    if (ctx.json) {
      ctx.out.json({ starters: starters.map((s) => s.id), modules: modules.map((m) => m.id) });
      return 0;
    }

    ctx.out.print('Starters:');
    for (const s of starters) {
      ctx.out.print(`  - ${s.id}`);
    }
    ctx.out.print('Modules:');
    for (const m of modules) {
      ctx.out.print(`  - ${m.id}`);
    }
    return 0;
  },

  async explain(ctx) {
    requireProject(ctx.cwd);
    const requested = ctx.args.filter((a) => !a.startsWith('--'));
    const { plan } = buildPlan(ctx, requested);
    ctx.out.print(`Plan ${plan.planId} will:`);
    ctx.out.print(`  - Install modules in order: ${plan.dependencyOrder.join(' -> ')}`);
    ctx.out.print(`  - Perform ${plan.fileOperations.length} file operations`);
    ctx.out.print(`  - Add ${plan.packageOperations.length} packages`);
    return 0;
  },

  async upgrade(ctx) {
    ctx.out.error(new ProjectFactoryError(CLI_ERROR_CODES.NOT_IMPLEMENTED, 'upgrade is not implemented'));
    return 2;
  },

  async help(ctx) {
    const text = 'Available commands: create <name> [starter], add <module...>, sync, status, doctor, plan <module...>, list, explain <module...>, upgrade --check, help';
    if (ctx.json) {
      ctx.out.json({ command: 'help', status: 'ok', text });
    } else {
      ctx.out.print(text);
    }
    return 0;
  },
};
