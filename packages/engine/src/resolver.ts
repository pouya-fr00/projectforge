import type { ModuleManifest } from '@projectforge/schemas';
import { ProjectFactoryError, EngineErrors } from './errors.js';
import { ENGINE_VERSION, isCompatible } from './compatibility.js';

export interface ResolveOptions {
  requested: string[];
  getModule: (id: string) => ModuleManifest | undefined;
  /**
   * When true, duplicate ids in requested list is an error.
   * When false, duplicates are de-duplicated.
   */
  strictDuplicates?: boolean;
}

export interface ResolvedGraph {
  order: string[];
  modules: Map<string, ModuleManifest>;
}

/**
 * Resolve requested modules plus their transitive dependencies into a
 * deterministic topological order.
 *
 * Detection:
 * - missing module (requested or required module not in registry)
 * - direct/indirect dependency cycle
 * - duplicate module id
 * - conflicting pair of modules
 */
export function resolveModuleGraph(options: ResolveOptions): ResolvedGraph {
  const { requested, getModule, strictDuplicates = false } = options;
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const modules = new Map<string, ModuleManifest>();

  if (strictDuplicates) {
    const count = new Map<string, number>();
    for (const id of requested) {
      count.set(id, (count.get(id) ?? 0) + 1);
    }
    for (const [id, c] of count) {
      if (c > 1) duplicates.add(id);
    }
  }

  // Normalize requested list preserving order while de-duplicating.
  const normalizedRequested: string[] = [];
  for (const id of requested) {
    if (!normalizedRequested.includes(id)) {
      normalizedRequested.push(id);
    }
  }

  // DFS stack for cycle detection.
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(id: string, chain: string[]) {
    if (visiting.has(id)) {
      const cycleStart = chain.indexOf(id);
      const cycle = [...chain.slice(cycleStart), id];
      throw new ProjectFactoryError(
        EngineErrors.CYCLIC_DEPENDENCY,
        `cyclic dependency detected: ${cycle.join(' -> ')}`,
        { id, cycle }
      );
    }

    if (visited.has(id)) {
      return;
    }

    const module = getModule(id);
    if (!module) {
      throw new ProjectFactoryError(
        EngineErrors.MODULE_NOT_FOUND,
        `module not found: ${id}`,
        { id }
      );
    }

    // Validate compatibility with the current engine version.
    if (module.engine && !isCompatible(ENGINE_VERSION, module.engine)) {
      throw new ProjectFactoryError(
        EngineErrors.INCOMPATIBLE_VERSION,
        `module "${id}" requires engine ${module.engine} but current engine is ${ENGINE_VERSION}`,
        { id, required: module.engine, current: ENGINE_VERSION }
      );
    }

    // Validate id consistency and conflicts.
    if (module.id !== id) {
      throw new ProjectFactoryError(
        EngineErrors.MODULE_NOT_FOUND,
        `module id mismatch: registry returned "${module.id}" for "${id}"`,
        { requestedId: id, returnedId: module.id }
      );
    }

    visiting.add(id);
    seen.add(id);
    modules.set(id, module);

    for (const depId of module.requires) {
      visit(depId, [...chain, id]);
    }

    visiting.delete(id);
    visited.add(id);
    order.push(id);
  }

  for (const id of normalizedRequested) {
    visit(id, []);
  }

  detectConflicts(order, modules);

  if (strictDuplicates && duplicates.size > 0) {
    throw new ProjectFactoryError(
      EngineErrors.DUPLICATE_MODULE,
      `duplicate module ids in request: ${Array.from(duplicates).join(', ')}`,
      { duplicateIds: Array.from(duplicates) }
    );
  }

  return { order, modules };
}

/**
 * Check for explicit module conflicts. Throws if any pair of selected modules
 * conflict with each other.
 */
export function detectConflicts(selectedIds: string[], modules: Map<string, ModuleManifest>): void {
  const selectedSet = new Set(selectedIds);
  for (const id of selectedIds) {
    const module = modules.get(id);
    if (!module) {
      throw new ProjectFactoryError(
        EngineErrors.MODULE_NOT_FOUND,
        `cannot check conflicts for missing module: ${id}`,
        { id }
      );
    }
    for (const conflict of module.conflicts) {
      if (selectedSet.has(conflict)) {
        throw new ProjectFactoryError(
          EngineErrors.MODULE_CONFLICT,
          `module "${id}" conflicts with "${conflict}"`,
          { id, conflict }
        );
      }
    }
  }
}
