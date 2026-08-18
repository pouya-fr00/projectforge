import type { ProjectState } from './project.js';
import type { StarterManifest, StarterCompatibility, GeneratedOwnership } from './starter.js';
import type { ModuleManifest } from './module.js';
import type { ProjectLock } from './lock.js';
import { SchemaValidationError } from './errors.js';

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new SchemaValidationError(field, 'must be a non-empty string', value);
  }
}

function assertArrayOfStrings(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new SchemaValidationError(field, 'must be an array', value);
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string') {
      throw new SchemaValidationError(`${field}[${i}]`, 'must be a string', value[i]);
    }
  }
  return value;
}

const idPattern = /^[a-z][a-z0-9-]*$/;

export function validateId(value: unknown, field = 'id'): string {
  assertNonEmptyString(value, field);
  if (!idPattern.test(value)) {
    throw new SchemaValidationError(field, "must match kebab-case pattern '^[a-z][a-z0-9-]*$'", value);
  }
  return value;
}

export function validateSemVer(value: unknown, field = 'version'): string {
  assertNonEmptyString(value, field);
  // Allow semver-like strings (e.g., 0.1.0, >=0.1.0 <0.2.0)
  if (!/^(?:\d+\.\d+\.\d+|>=?\d+\.\d+\.\d+(?:\s+<\d+\.\d+\.\d+)?)$/.test(value)) {
    throw new SchemaValidationError(field, 'must be a valid semantic version or range', value);
  }
  return value;
}

export function validateProjectState(state: unknown): asserts state is ProjectState {
  if (typeof state !== 'object' || state === null) {
    throw new SchemaValidationError('state', 'must be an object', state);
  }
  const s = state as Partial<ProjectState>;
  if (typeof s.schemaVersion !== 'number') {
    throw new SchemaValidationError('schemaVersion', 'must be a number', s.schemaVersion);
  }
  assertNonEmptyString(s.root, 'root');
  if (typeof s.config !== 'object' || s.config === null) {
    throw new SchemaValidationError('config', 'must be an object', s.config);
  }
  assertNonEmptyString(s.config.name, 'config.name');
  assertNonEmptyString(s.config.starter, 'config.starter');
  assertArrayOfStrings(s.config.modules, 'config.modules');
  assertArrayOfStrings(s.installedModules, 'installedModules');
}

export function validateStarterManifest(manifest: unknown): asserts manifest is StarterManifest {
  if (typeof manifest !== 'object' || manifest === null) {
    throw new SchemaValidationError('manifest', 'must be an object', manifest);
  }
  const m = manifest as Partial<StarterManifest>;
  if (typeof m.schemaVersion !== 'number') {
    throw new SchemaValidationError('schemaVersion', 'must be a number', m.schemaVersion);
  }
  validateId(m.id, 'id');
  validateSemVer(m.version, 'version');
  assertNonEmptyString(m.displayName, 'displayName');
  assertNonEmptyString(m.description, 'description');
  if (typeof m.compatibility !== 'object' || m.compatibility === null) {
    throw new SchemaValidationError('compatibility', 'must be an object', m.compatibility);
  }
  const compat = m.compatibility as Partial<StarterCompatibility>;
  assertNonEmptyString(compat.engine, 'compatibility.engine');
  if (m.templateOperations !== undefined && !Array.isArray(m.templateOperations)) {
    throw new SchemaValidationError('templateOperations', 'must be an array', m.templateOperations);
  }
  assertArrayOfStrings(m.files, 'files');
  assertArrayOfStrings(m.verificationCommands, 'verificationCommands');
  if (typeof m.generatedOwnership !== 'object' || m.generatedOwnership === null) {
    throw new SchemaValidationError('generatedOwnership', 'must be an object', m.generatedOwnership);
  }
  const ownership = m.generatedOwnership as Partial<GeneratedOwnership>;
  assertArrayOfStrings(ownership.factoryGenerated ?? [], 'generatedOwnership.factoryGenerated');
  assertArrayOfStrings(ownership.features ?? [], 'generatedOwnership.features');
  assertArrayOfStrings(ownership.extensions ?? [], 'generatedOwnership.extensions');
}

export function validateModuleManifest(manifest: unknown): asserts manifest is ModuleManifest {
  if (typeof manifest !== 'object' || manifest === null) {
    throw new SchemaValidationError('manifest', 'must be an object', manifest);
  }
  const m = manifest as Partial<ModuleManifest>;
  if (typeof m.schemaVersion !== 'number') {
    throw new SchemaValidationError('schemaVersion', 'must be a number', m.schemaVersion);
  }
  validateId(m.id, 'id');
  validateSemVer(m.version, 'version');
  assertNonEmptyString(m.displayName, 'displayName');
  assertNonEmptyString(m.description, 'description');
  assertNonEmptyString(m.engine, 'engine');
  assertArrayOfStrings(m.starters, 'starters');
  assertArrayOfStrings(m.requires, 'requires');
  assertArrayOfStrings(m.conflicts, 'conflicts');
  if (!Array.isArray(m.capabilities)) {
    throw new SchemaValidationError('capabilities', 'must be an array', m.capabilities);
  }
  if (m.templateDir !== undefined) {
    assertNonEmptyString(m.templateDir, 'templateDir');
  }
  assertArrayOfStrings(m.files, 'files');
  assertArrayOfStrings(m.generatedContributions, 'generatedContributions');
  assertArrayOfStrings(m.packages, 'packages');
  assertArrayOfStrings(m.devPackages, 'devPackages');
  assertArrayOfStrings(m.environment, 'environment');
  assertArrayOfStrings(m.migrations, 'migrations');
  assertArrayOfStrings(m.verification, 'verification');
  if (!Array.isArray(m.routeContributions)) {
    throw new SchemaValidationError('routeContributions', 'must be an array', m.routeContributions);
  }
  for (let i = 0; i < m.routeContributions.length; i++) {
    const rc = m.routeContributions[i] as unknown as Record<string, unknown>;
    if (typeof rc !== 'object' || rc === null) {
      throw new SchemaValidationError(`routeContributions[${i}]`, 'must be an object', rc);
    }
    assertNonEmptyString(rc.path, `routeContributions[${i}].path`);
    assertNonEmptyString(rc.import, `routeContributions[${i}].import`);
  }
  if (!Array.isArray(m.webRouteContributions)) {
    throw new SchemaValidationError('webRouteContributions', 'must be an array', m.webRouteContributions);
  }
  for (let i = 0; i < m.webRouteContributions.length; i++) {
    const rc = m.webRouteContributions[i] as unknown as Record<string, unknown>;
    if (typeof rc !== 'object' || rc === null) {
      throw new SchemaValidationError(`webRouteContributions[${i}]`, 'must be an object', rc);
    }
    assertNonEmptyString(rc.path, `webRouteContributions[${i}].path`);
    assertNonEmptyString(rc.import, `webRouteContributions[${i}].import`);
  }
  assertNonEmptyString(m.documentation, 'documentation');
}

function validateInstalledModule(value: unknown, field: string): void {
  if (typeof value !== 'object' || value === null) {
    throw new SchemaValidationError(field, 'must be an object', value);
  }
  const m = value as Partial<{ id: unknown; version: unknown; checksum: unknown }>;
  validateId(m.id, `${field}.id`);
  validateSemVer(m.version, `${field}.version`);
  assertNonEmptyString(m.checksum, `${field}.checksum`);
}

export function validateProjectLock(lock: unknown): asserts lock is ProjectLock {
  if (typeof lock !== 'object' || lock === null) {
    throw new SchemaValidationError('lock', 'must be an object', lock);
  }
  const l = lock as Partial<ProjectLock>;
  if (typeof l.schemaVersion !== 'number') {
    throw new SchemaValidationError('schemaVersion', 'must be a number', l.schemaVersion);
  }
  if (typeof l.engineVersion !== 'string') {
    throw new SchemaValidationError('engineVersion', 'must be a string', l.engineVersion);
  }
  if (typeof l.timestamp !== 'string') {
    throw new SchemaValidationError('timestamp', 'must be a string', l.timestamp);
  }
  validateInstalledModule(l.starter, 'starter');
  if (!Array.isArray(l.modules)) {
    throw new SchemaValidationError('modules', 'must be an array', l.modules);
  }
  for (let i = 0; i < l.modules.length; i++) {
    validateInstalledModule(l.modules[i], `modules[${i}]`);
  }
  if (typeof l.generatedChecksums !== 'object' || l.generatedChecksums === null) {
    throw new SchemaValidationError('generatedChecksums', 'must be an object', l.generatedChecksums);
  }
  if (l.provenance !== undefined && (typeof l.provenance !== 'object' || l.provenance === null)) {
    throw new SchemaValidationError('provenance', 'must be an object', l.provenance);
  }
  const provenance = l.provenance ?? {};
  for (const [filePath, entry] of Object.entries(provenance)) {
    if (typeof entry !== 'object' || entry === null) {
      throw new SchemaValidationError(`provenance[${filePath}]`, 'must be an object', entry);
    }
    const p = entry as Partial<{ path: unknown; sha256: unknown; ownership: unknown; ownerId: unknown; ownerVersion: unknown; operation: unknown; classification: unknown; schemaVersion: unknown }>;
    assertNonEmptyString(p.path, `provenance[${filePath}].path`);
    assertNonEmptyString(p.sha256, `provenance[${filePath}].sha256`);
    assertNonEmptyString(p.ownership, `provenance[${filePath}].ownership`);
    assertNonEmptyString(p.ownerId, `provenance[${filePath}].ownerId`);
    assertNonEmptyString(p.ownerVersion, `provenance[${filePath}].ownerVersion`);
    assertNonEmptyString(p.operation, `provenance[${filePath}].operation`);
    assertNonEmptyString(p.classification, `provenance[${filePath}].classification`);
    if (typeof p.schemaVersion !== 'number') {
      throw new SchemaValidationError(`provenance[${filePath}].schemaVersion`, 'must be a number', p.schemaVersion);
    }
  }
}
