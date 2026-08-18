import { describe, it, expect } from 'vitest';
import { resolveSafePath, assertInsideProject } from './index.js';
import { ProjectFactoryError } from './index.js';
import path from 'node:path';

const ROOT = path.resolve('/tmp/project-root');

describe('resolveSafePath', () => {
  it('resolves a simple relative path', () => {
    const result = resolveSafePath(ROOT, 'src/index.ts');
    expect(result.relative).toBe('src/index.ts');
    expect(result.absolute).toBe(path.resolve(ROOT, 'src/index.ts'));
  });

  it('resolves a nested relative path', () => {
    const result = resolveSafePath(ROOT, 'packages/engine/src/planner.ts');
    expect(result.relative).toBe('packages/engine/src/planner.ts');
  });

  it('rejects ../ traversal', () => {
    expect(() => resolveSafePath(ROOT, '../etc/passwd')).toThrow(ProjectFactoryError);
  });

  it('rejects path that escapes root through nested traversal', () => {
    expect(() => resolveSafePath(ROOT, 'foo/bar/../../../../etc/passwd')).toThrow(ProjectFactoryError);
  });

  it('rejects absolute POSIX path', () => {
    if (process.platform !== 'win32') {
      expect(() => resolveSafePath(ROOT, '/etc/passwd')).toThrow(ProjectFactoryError);
    } else {
      expect(() => resolveSafePath(ROOT, 'C:\\Windows')).toThrow(ProjectFactoryError);
    }
  });

  it('rejects absolute Windows path', () => {
    if (process.platform !== 'win32') {
      // On POSIX this string is not absolute; skip the throw assertion.
      return;
    }
    expect(() => resolveSafePath(ROOT, 'D:\\secret')).toThrow(ProjectFactoryError);
  });

  it('allows a dot-prefixed path under root', () => {
    const result = resolveSafePath(ROOT, './src/index.ts');
    expect(result.relative).toBe('src/index.ts');
  });

  it('normalizes redundant segments without escaping root', () => {
    const result = resolveSafePath(ROOT, 'a/b/../c/index.ts');
    expect(result.relative).toBe('a/c/index.ts');
  });

  it('throws a ProjectFactoryError with code', () => {
    try {
      resolveSafePath(ROOT, '../escape');
      expect.unreachable('expected error');
    } catch (err) {
      expect(err).toBeInstanceOf(ProjectFactoryError);
      expect((err as ProjectFactoryError).code).toBe('PF_PATH_ESCAPE');
    }
  });
});

describe('assertInsideProject', () => {
  it('passes for a path inside root', () => {
    expect(() => assertInsideProject(ROOT, path.resolve(ROOT, 'src/index.ts'))).not.toThrow();
  });

  it('throws for a path outside root', () => {
    const outside = path.resolve(ROOT, '../other');
    expect(() => assertInsideProject(ROOT, outside)).toThrow(ProjectFactoryError);
  });
});
