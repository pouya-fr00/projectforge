# ADR-006: Real package `dist/` emit and test source resolution

## Status

Accepted — Phase 3 closure

## Context

Phase 2 deferred real `dist/` emit to Phase 8 (see ADR-005) because the monorepo relied on cross-package TypeScript path mappings and typecheck-only builds. Phase 3 introduced a runnable CLI (`packages/cli/bin/projectforge.js`) that must execute without a TypeScript loader. This forces a real build step that emits consumable JavaScript for each package.

Implementing real emit introduced a second requirement: unit tests must continue to run against source TypeScript files so that tests pick up changes immediately and do not require a previous build. Package `main`/`exports` that point only to `dist/` would break test resolution before a build, and pointing them only to source would break the built CLI.

## Decision

1. Emit real `dist/` artifacts for every workspace package.
   - Each package has a `tsconfig.build.json` that extends its normal `tsconfig.json` and overrides `paths` to `{}`.
   - The build script is `tsc -p tsconfig.build.json`, which emits `.js`, `.js.map`, and `.d.ts` files into `dist/`.
   - `package.json` `main`, `types`, and `exports.default` point to the emitted `dist/` files.

2. Use a custom `development` export condition so that Vitest resolves workspace packages to their TypeScript source.
   - Each package's `exports["."]` block is ordered as: `development` (→ `src/index.ts`), `types` (→ `dist/index.d.ts`), `default` (→ `dist/index.js`).
   - `vitest.config.ts` sets `resolve.conditions: ['development']`.
   - TypeScript uses the `types` condition and therefore still resolves `dist/index.d.ts` for declaration consumers; during active development, `tsconfig.base.json` `paths` overrides this for the workspace anyway.

3. The CLI bin entrypoint (`packages/cli/bin/projectforge.js`) imports from the emitted `../dist/index.js` only, so it never depends on TypeScript source at runtime.

## Consequences

- The built CLI is runnable from outside the repository without a TypeScript loader.
- Tests remain fast and source-first.
- Consumers outside the workspace that import `@projectforge/*` without the `development` condition will use `dist/`.
- The `development` condition is non-standard; it must be documented and maintained consistently across all packages.
- Build order is handled by pnpm's workspace topological execution (`pnpm -r build`).

## Acceptance criteria

- `pnpm -r build` produces a `dist/` directory in every package.
- `node packages/cli/bin/projectforge.js --help` works immediately after the build.
- `node packages/cli/bin/projectforge.js --help` works when invoked from an arbitrary directory (e.g., the system temp directory).
- `pnpm -r test` passes without requiring `dist/` to exist.
- `pnpm -r typecheck` and `pnpm lint` pass.

## Related files

- `tsconfig.base.json`, `pnpm-workspace.yaml`
- `packages/*/tsconfig.build.json`
- `packages/*/package.json`
- `vitest.config.ts`
- `packages/cli/bin/projectforge.js`
