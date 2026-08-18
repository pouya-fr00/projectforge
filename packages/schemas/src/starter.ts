import type { Identifiable } from './types.js';

export interface StarterCompatibility {
  engine: string;
  node?: string;
}

export interface GeneratedOwnership {
  factoryGenerated: string[];
  features: string[];
  extensions: string[];
}

export interface TemplateOperation {
  source: string;
  target: string;
  kind: 'copy' | 'render';
}

export interface StarterManifest extends Identifiable {
  schemaVersion: number;
  version: string;
  displayName: string;
  description: string;
  compatibility: StarterCompatibility;
  templateDir: string;
  files: string[];
  templateOperations: TemplateOperation[];
  verificationCommands: string[];
  generatedOwnership: GeneratedOwnership;
}
