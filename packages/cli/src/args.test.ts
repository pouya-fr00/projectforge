import { describe, it, expect } from 'vitest';
import { parseArgs } from './args.js';

describe('parseArgs', () => {
  it('defaults to help command with no args', () => {
    const result = parseArgs([]);
    expect(result.command).toBe('help');
    expect(result.positional).toEqual([]);
  });

  it('parses a command and positional args', () => {
    const result = parseArgs(['add', 'auth', 'database']);
    expect(result.command).toBe('add');
    expect(result.positional).toEqual(['auth', 'database']);
  });

  it('detects --json', () => {
    const result = parseArgs(['--json', 'status']);
    expect(result.json).toBe(true);
    expect(result.command).toBe('status');
  });

  it('detects --dry-run and --no-install', () => {
    const result = parseArgs(['--dry-run', '--no-install', 'add', 'auth']);
    expect(result.dryRun).toBe(true);
    expect(result.noInstall).toBe(true);
    expect(result.command).toBe('add');
  });

  it('detects --cwd', () => {
    const result = parseArgs(['--cwd', '/tmp/project', 'status']);
    expect(result.cwd).toBe('/tmp/project');
    expect(result.command).toBe('status');
  });

  it('detects --version', () => {
    const result = parseArgs(['--version']);
    expect(result.version).toBe(true);
  });

  it('detects --help', () => {
    const result = parseArgs(['--help']);
    expect(result.help).toBe(true);
  });
});
