import fs from 'node:fs';
import path from 'node:path';
import type { ProjectConfig, ProjectState } from '@projectforge/schemas';
import { ProjectFactoryError } from './errors.js';

export const ProjectErrorCodes = {
  PROJECT_READ_FAILED: 'PF_PROJECT_READ_FAILED',
  PROJECT_WRITE_FAILED: 'PF_PROJECT_WRITE_FAILED',
} as const;

export const PROJECT_CONFIG_FILE = 'projectforge.json';

export function readProjectConfig(projectRoot: string): ProjectConfig {
  const configPath = path.join(projectRoot, PROJECT_CONFIG_FILE);
  let raw: string;
  try {
    raw = fs.readFileSync(configPath, 'utf-8');
  } catch (e) {
    throw new ProjectFactoryError(
      ProjectErrorCodes.PROJECT_READ_FAILED,
      `cannot read project config: ${configPath}`,
      { path: configPath, cause: (e as Error).message }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new ProjectFactoryError(
      ProjectErrorCodes.PROJECT_READ_FAILED,
      `invalid JSON in project config: ${configPath}`,
      { path: configPath, cause: (e as Error).message }
    );
  }

  return parsed as ProjectConfig;
}

export function writeProjectConfig(projectRoot: string, config: ProjectConfig): void {
  const configPath = path.join(projectRoot, PROJECT_CONFIG_FILE);
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  } catch (e) {
    throw new ProjectFactoryError(
      ProjectErrorCodes.PROJECT_WRITE_FAILED,
      `cannot write project config: ${configPath}`,
      { path: configPath, cause: (e as Error).message }
    );
  }
}

export function createProjectState(projectRoot: string, config: ProjectConfig, installedModules: string[] = []): ProjectState {
  return {
    schemaVersion: config.schemaVersion,
    root: projectRoot,
    config,
    installedModules,
  };
}
