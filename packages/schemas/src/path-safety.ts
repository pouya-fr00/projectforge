import path from 'node:path';
import { ProjectFactoryError, PathErrorCodes } from './errors.js';

export interface SafePathResult {
  absolute: string;
  relative: string;
}

export function resolveSafePath(projectRoot: string, target: string): SafePathResult {
  const absoluteRoot = path.resolve(projectRoot);

  if (path.isAbsolute(target)) {
    throw new ProjectFactoryError(
      PathErrorCodes.INVALID_PATH,
      `absolute paths are not allowed: ${target}`,
      { target }
    );
  }

  const resolved = path.resolve(absoluteRoot, target);
  const rel = path.relative(absoluteRoot, resolved);
  const normalizedRel = rel.replace(/\\/g, '/');

  if (normalizedRel.startsWith('..') || path.isAbsolute(normalizedRel)) {
    throw new ProjectFactoryError(
      PathErrorCodes.PATH_ESCAPE,
      `path escapes project root: ${target}`,
      { target, projectRoot: absoluteRoot }
    );
  }

  return { absolute: resolved, relative: normalizedRel };
}

export function assertInsideProject(projectRoot: string, absolutePath: string): void {
  const absoluteRoot = path.resolve(projectRoot);
  const resolvedPath = path.resolve(absolutePath);
  const rel = path.relative(absoluteRoot, resolvedPath).replace(/\\/g, '/');
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new ProjectFactoryError(
      PathErrorCodes.PATH_ESCAPE,
      `resolved path escapes project root: ${absolutePath}`,
      { absolutePath, projectRoot: absoluteRoot }
    );
  }
}
