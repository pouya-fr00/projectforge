/**
 * Base types and lightweight validation helpers.
 * Full parser implementation is a Phase 2 concern.
 */

export type SemVer = string;

export type EngineRange = string;

export interface Identifiable {
  id: string;
  version: SemVer;
}

export interface Capability {
  id: string;
  description: string;
}

export interface ProjectConfig {
  schemaVersion: number;
  name: string;
  starter: string;
  modules: string[];
}
