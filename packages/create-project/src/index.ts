/**
 * Project Factory — Create Project
 *
 * Public entry for `npm create projectforge` and similar flows.
 * Phase 1 skeleton only.
 */

export interface CreateOptions {
  projectName: string;
  starter: string;
  targetDir: string;
}

export function createProject(_options: CreateOptions): Promise<void> {
  return Promise.reject(new Error('create-project: not implemented in Phase 1'));
}
