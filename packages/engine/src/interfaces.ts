/**
 * Engine ports/adapters. Concrete adapters live in the CLI or test harness.
 */

export interface FileSystemAdapter {
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, content: Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  rm(path: string): Promise<void>;
}

export interface ProcessAdapter {
  exec(command: string, args: string[], cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }>;
}

export interface EngineContext {
  fs: FileSystemAdapter;
  process: ProcessAdapter;
}
