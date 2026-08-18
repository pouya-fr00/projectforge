import type { Identifiable, Capability, EngineRange } from './types.js';

export interface RouteContribution {
  path: string;
  import: string;
}

export interface ModuleManifest extends Identifiable {
  schemaVersion: number;
  version: string;
  displayName: string;
  description: string;
  engine: EngineRange;
  starters: string[];
  requires: string[];
  conflicts: string[];
  capabilities: Capability[];
  templateDir?: string;
  files: string[];
  generatedContributions: string[];
  packages: string[];
  devPackages: string[];
  environment: string[];
  migrations: string[];
  verification: string[];
  routeContributions: RouteContribution[];
  webRouteContributions: RouteContribution[];
  documentation: string;
}
