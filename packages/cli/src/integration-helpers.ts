import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CLI_PATH = path.resolve(__dirname, '../bin/projectforge.js');

export interface RunCliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runCli(args: string[], cwd: string, env?: NodeJS.ProcessEnv): Promise<RunCliResult> {
  return new Promise((resolve) => {
    execFile(process.execPath, [CLI_PATH, ...args], { cwd, env: { ...process.env, ...env } }, (error, stdout, stderr) => {
      if (error) {
        const code = typeof error.code === 'number' ? error.code : 1;
        resolve({ exitCode: code, stdout: stdout ?? '', stderr: (stderr ?? '') + '\n[runCli error] ' + (error.message ?? String(error)) });
        return;
      }
      resolve({ exitCode: 0, stdout: stdout ?? '', stderr: stderr ?? '' });
    });
  });
}

export function parseEnvelope(stdout: string) {
  return JSON.parse(stdout);
}
