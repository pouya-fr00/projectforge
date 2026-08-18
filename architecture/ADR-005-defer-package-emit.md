# ADR-005: Defer real package `dist/` emit to Phase 8

## Status

Superseded by ADR-006 — Phase 3 closure

## Context

Phase 1 established a pnpm monorepo with cross-package TypeScript path mappings in `tsconfig.base.json`. The workspace uses `workspace:*` dependencies and builds run `tsc --noEmit` for typechecking. A real `dist/` emit was initially anticipated for Phase 2, but doing so now would require one of the following:

1. **Project references** with `composite`, `declaration`, and `references` arrays, plus a separate `tsconfig.build.json` per package to avoid the `rootDir` conflict with cross-package source imports.
2. **A bundler** (e.g., tsup, rollup, unbuild) to produce the `dist/` tree and handle ESM/CJS boundaries.
3. **Flattening the monorepo** or removing cross-package source imports.

None of these are impossible, but all introduce tooling complexity that is not required for the core Phase 2 deliverables: schemas, validators, dependency resolution, pure planning, and path safety. Phase 3 will execute plans through an in-memory/in-process engine that can still consume source TypeScript via the existing tooling.

## Decision

Defer real `dist/` package emit to **Phase 8 — Hardening and examples**. Until then, packages continue to typecheck only (`tsc --noEmit`).

## Consequences

- Phase 2 and Phase 3 development velocity remains high.
- We do not catch ESM/CJS boundary or `.js` extension issues early.
- Runtime execution requires a TypeScript loader (e.g., `tsx`) until `dist/` is emitted.
- `dist/` directories remain ignored in `.gitignore`.

## Acceptance criteria for Phase 8

- Every workspace package emits a correct `dist/` directory with `.js` and `.d.ts` files.
- The emitted output is pure ESM with explicit `.js` extensions.
- `packages/cli/bin/projectforge.js` runs using the emitted `dist/` files without a TypeScript loader.
- `npm install -g <tarball>` produces a working global CLI.
- No TypeScript source files are referenced at runtime.
- Lockfile and dependency graph are consistent with the emitted artifacts.

## Related files

- `docs/KNOWN_ISSUES.md`
- Root `package.json`, `tsconfig.base.json`, `pnpm-workspace.yaml`
