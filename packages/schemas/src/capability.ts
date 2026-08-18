import type { Capability } from './types.js';

export interface CapabilityCatalog {
  capabilities: Capability[];
}

export function catalogCapabilities(modules: { capabilities: string[] }[]): Capability[] {
  const ids = new Set<string>();
  for (const module of modules) {
    for (const id of module.capabilities) {
      ids.add(id);
    }
  }
  return Array.from(ids).map((id) => ({ id, description: '' }));
}
