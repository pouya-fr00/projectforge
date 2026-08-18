import fs from 'node:fs';
import path from 'node:path';
import type { ProcessAdapter } from './interfaces.js';

export type PackageManagerName = 'npm' | 'pnpm' | 'yarn';

export interface PackageManagerAdapter {
  readonly name: PackageManagerName;
  add(packages: string[], cwd: string, targetManifest?: string): Promise<{ exitCode: number; stdout: string; stderr: string }>;
  addDev(packages: string[], cwd: string, targetManifest?: string): Promise<{ exitCode: number; stdout: string; stderr: string }>;
  remove(packages: string[], cwd: string, targetManifest?: string): Promise<{ exitCode: number; stdout: string; stderr: string }>;
  install(cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }>;
}

function detectFromLockfiles(projectRoot: string): PackageManagerName | undefined {
  if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(projectRoot, 'package-lock.json'))) return 'npm';
  return undefined;
}

export function detectPackageManager(projectRoot: string, prefer?: PackageManagerName): PackageManagerName {
  if (prefer) return prefer;
  const detected = detectFromLockfiles(projectRoot);
  if (detected) return detected;
  if (fs.existsSync(path.join(projectRoot, 'pnpm-workspace.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
    return 'npm';
  }
  return 'pnpm';
}

export function readWorkspaceApiName(cwd: string, targetManifest?: string): string | undefined {
  try {
    const manifestPath = targetManifest ?? 'apps/api/package.json';
    const raw = fs.readFileSync(path.join(cwd, manifestPath), 'utf-8');
    const pkg = JSON.parse(raw) as { name?: string };
    return pkg.name;
  } catch {
    return undefined;
  }
}

export function createPackageManagerAdapter(
  name: PackageManagerName,
  process: ProcessAdapter
): PackageManagerAdapter {
  function run(command: string, args: string[], cwd: string) {
    return process.exec(command, args, cwd);
  }

  function addArgs(cwd: string, packages: string[], dev: boolean, targetManifest?: string): [string, string[]] {
    const workspaceName = readWorkspaceApiName(cwd, targetManifest);
    if (name === 'npm') {
      const args = dev
        ? ['install', '--save-dev', ...packages]
        : ['install', '--save', ...packages];
      return ['npm', args];
    }
    if (name === 'yarn') {
      const args = dev ? ['add', '--dev', ...packages] : ['add', ...packages];
      return ['yarn', args];
    }
    if (workspaceName) {
      const args = dev
        ? ['add', '--filter', workspaceName, '--save-dev', ...packages]
        : ['add', '--filter', workspaceName, ...packages];
      return ['pnpm', args];
    }
    const args = dev ? ['add', '--save-dev', ...packages] : ['add', ...packages];
    return ['pnpm', args];
  }

  function removeArgs(cwd: string, packages: string[], targetManifest?: string): [string, string[]] {
    const workspaceName = readWorkspaceApiName(cwd, targetManifest);
    if (name === 'npm') return ['npm', ['uninstall', ...packages]];
    if (name === 'yarn') return ['yarn', ['remove', ...packages]];
    if (workspaceName) return ['pnpm', ['remove', '--filter', workspaceName, ...packages]];
    return ['pnpm', ['remove', ...packages]];
  }

  return {
    name,
    add(packages, cwd, targetManifest) {
      const [cmd, args] = addArgs(cwd, packages, false, targetManifest);
      return run(cmd, args, cwd);
    },
    addDev(packages, cwd, targetManifest) {
      const [cmd, args] = addArgs(cwd, packages, true, targetManifest);
      return run(cmd, args, cwd);
    },
    remove(packages, cwd, targetManifest) {
      const [cmd, args] = removeArgs(cwd, packages, targetManifest);
      return run(cmd, args, cwd);
    },
    install(cwd) {
      if (name === 'npm') return run('npm', ['install'], cwd);
      if (name === 'yarn') return run('yarn', ['install'], cwd);
      return run('pnpm', ['install'], cwd);
    },
  };
}
