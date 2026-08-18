import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface TempWorkspace {
  root: string;
  cleanup: () => void;
}

export function createTempWorkspace(prefix = 'pf-test-'): TempWorkspace {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    root,
    cleanup: () => {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}
