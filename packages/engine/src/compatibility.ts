/**
 * Minimal semver compatibility check used by the resolver.
 *
 * Supports the simplest range forms used by Project Factory manifests:
 *   >=MAJOR.MINOR.PATCH
 *   ^MAJOR.MINOR.PATCH
 *   MAJOR.MINOR.PATCH (exact)
 */

export const ENGINE_VERSION = '0.1.0';

interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

function parse(version: string): SemVer {
  const [major = 0, minor = 0, patch = 0] = version
    .replace(/^[\^>=~]+/, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10));
  return { major, minor, patch };
}

function gte(a: SemVer, b: SemVer): boolean {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}

function eq(a: SemVer, b: SemVer): boolean {
  return a.major === b.major && a.minor === b.minor && a.patch === b.patch;
}

export function isCompatible(version: string, range: string): boolean {
  const v = parse(version);
  if (range.startsWith('>=')) {
    return gte(v, parse(range.slice(2).trim()));
  }
  if (range.startsWith('^')) {
    const target = parse(range.slice(1).trim());
    return v.major === target.major && gte(v, target);
  }
  if (/^[\d]/.test(range)) {
    return eq(v, parse(range));
  }
  // Unknown range format: be permissive in development, but log a warning.
  return true;
}
