import type { SemVer } from './types.js';

export interface InstalledModule {
  id: string;
  version: SemVer;
  checksum: string;
}

export type FileOwnershipType = 'factory-generated' | 'module-managed' | 'user-owned' | 'extension-point' | 'unknown';

export type FileClassification = 'generated' | 'managed' | 'user' | 'extension' | 'unknown';

export interface FileProvenance {
  path: string;
  sha256: string;
  ownership: FileOwnershipType;
  ownerId: string;
  ownerVersion: string;
  operation: string;
  classification: FileClassification;
  schemaVersion: number;
}

export interface ProjectLock {
  schemaVersion: number;
  engineVersion: SemVer;
  starter: InstalledModule;
  modules: InstalledModule[];
  /**
   * @deprecated Kept for backward compatibility. New code should use `provenance`.
   */
  generatedChecksums: Record<string, string>;
  provenance: Record<string, FileProvenance>;
  timestamp: string;
}
