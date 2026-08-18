import type { ProjectConfig } from './types.js';

export interface ProjectState {
  schemaVersion: number;
  root: string;
  config: ProjectConfig;
  installedModules: string[];
}

export interface ProjectFactoryConfig {
  schemaVersion: number;
  engineVersion: string;
}
