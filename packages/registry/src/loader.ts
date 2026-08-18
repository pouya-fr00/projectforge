import type { ModuleManifest, StarterManifest } from '@projectforge/schemas';

export interface Registry {
  listStarters(): StarterManifest[];
  listModules(): ModuleManifest[];
  getStarter(id: string): StarterManifest | undefined;
  getModule(id: string): ModuleManifest | undefined;
}

export class BundledRegistry implements Registry {
  // Phase 1: empty registry; assets will be bundled in Phase 4.
  listStarters(): StarterManifest[] {
    return [];
  }

  listModules(): ModuleManifest[] {
    return [];
  }

  getStarter(_id: string): StarterManifest | undefined {
    return undefined;
  }

  getModule(_id: string): ModuleManifest | undefined {
    return undefined;
  }
}
