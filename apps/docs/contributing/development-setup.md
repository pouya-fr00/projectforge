# Contributing to Project Forge

Project Forge is a local-first, open-source CLI. This guide covers contributing to the factory monorepo itself.

**This is not a public repository yet.** The paths and conventions below reflect the current workspace. Public contribution workflows will be added after the repository is made public.

## Development setup

### Prerequisites

- **Node.js** v24 or later
- **pnpm** v11 or later
- **Git**

### Clone and install

```bash
git clone <repository-url>
cd ProjectFactory
pnpm install
```

### Monorepo structure

```
ProjectFactory/
├── packages/
│   ├── schemas/          # Shared TypeScript types and validators
│   ├── engine/           # Resolver, planner, executor, path-safety
│   ├── registry/         # Starter and module manifests + templates
│   ├── cli/              # CLI entry point, commands, output layer
│   ├── create-project/   # Script invoked by `projectforge create`
│   └── test-harness/     # Test utilities and helpers
├── apps/
│   └── docs/             # VitePress documentation site
├── architecture/         # Architectural Decision Records (ADRs)
├── documentation/        # Blueprints and documentation standards
├── quality/              # Test strategies, usability tests, security reviews
└── docs/                 # Known issues and other documentation
```

### Running validation

Run these in order after making changes:

```bash
pnpm lint                          # ESLint across all packages
pnpm -r typecheck                  # TypeScript type-checking
pnpm -r test                       # Unit and integration tests
pnpm -r build                      # Build all packages
pnpm --filter @projectforge/docs build  # Build the docs site
```

### Running a single package

```bash
pnpm --filter @projectforge/engine test -- --run
pnpm --filter @projectforge/cli typecheck
```

### Running focused tests

```bash
cd packages/cli
npx vitest run src/docs.integration.test.ts
npx vitest run --reporter=verbose src/links.test.ts
```

## Adding or changing a module

Modules live under `packages/registry/modules/<name>/`.

### Module manifest

Every module has a `packages/registry/modules/<name>.json` manifest:

```json
{
  "id": "my-module",
  "version": "0.0.0",
  "schemaVersion": 1,
  "displayName": "My Module",
  "description": "What it does",
  "compatibility": { "engine": ">=0.0.0" },
  "dependencies": ["database-d1"],
  "packages": ["some-npm-package"],
  "devPackages": ["@workspace/test-utils"],
  "environment": ["MY_SECRET"],
  "routeContributions": [{ "path": "/api/my-feature", "importPath": "./features/my-feature/index.js" }],
  "webRouteContributions": [{ "path": "/my-feature", "importPath": "./features/my-feature/index.js" }],
  "migrations": ["migrations/000N_my_migration.sql"],
  "verificationCommands": ["pnpm -r typecheck"]
}
```

### Required files

| File | Purpose |
|---|---|
| `<name>.json` | Module manifest |
| `template/` | Files copied into the generated project |
| `template/apps/api/...` | API routes and tests |
| `template/apps/web/...` | Web components and tests |
| `template/packages/contracts/...` | Shared types |
| `template/migrations/` | SQL migration files |

### Manifest rules

- `id` must be kebab-case and unique across all modules.
- `dependencies` must refer to existing modules.
- All paths in manifest fields must be relative and safe (no `../` or absolute paths).
- `migrations` are SQL files that run via the generated project's `migrations/runner.mjs`.

## Tests

### Unit tests

Test individual functions in isolation. Use `vitest`:

```ts
import { describe, it, expect } from 'vitest';

describe('myFunction', () => {
  it('returns expected output', () => {
    expect(myFunction(input)).toEqual(output);
  });
});
```

### Integration tests

Test the CLI end-to-end using the provided helpers:

```ts
import { runCli } from './integration-helpers.js';
import path from 'node:path';
import os from 'node:os';

const TMP = path.join(os.tmpdir(), 'pf-test-' + Date.now());
// ... create project, run commands, assert results
```

Integration tests should:
- Run from a temp directory, never inside the repository.
- Clean up after themselves (use `afterAll`).
- Use `--no-install` for speed unless testing install behavior.

### Clean-room expectations

A clean-room test:

1. Creates a project with `projectforge create <name> --no-install`.
2. Adds modules to it.
3. Asserts the correct files were written.
4. Cleans up the temp directory.

Never run clean-room tests inside the repository.

## Documentation requirements

- Every new CLI flag or command must have a reference entry in `apps/docs/reference/cli.md`.
- Every new module must have an entry in `apps/docs/reference/modules.md`.
- Every new error code must appear in `apps/docs/reference/errors.md`.
- Documentation example tests (`packages/cli/src/docs.integration.test.ts`) must cover new commands.
- Link validation tests (`packages/cli/src/links.test.ts`) must pass.

## Commit scope

Commits should be scoped to a single phase or slice:

```
feat(phase<N>): <description>
fix(phase<N>): <description>
docs(phase<N>): <description>
```

Examples:
- `feat(phase5): better-auth drizzle d1 foundation`
- `fix(phase7): documentation example tests timeout`
- `docs(phase7): reconcile test counts, remove dead code`

## Maintainer approval

The following actions require explicit maintainer approval and must never be performed without it:

- Creating or publicizing a repository
- Pushing to GitHub or any remote
- Opening a Pull Request
- Publishing to npm
- Deploying to any service
- Creating a GitHub Release or tag
- Using credentials, tokens, or OAuth
- Merge operations
- Actions that incur cost
- Destructive or irreversible operations

## Reporting a bug

Since the repository is not yet public:

1. Document the bug in `docs/KNOWN_ISSUES.md`.
2. Include: the exact command, expected behavior, actual behavior, exit code, and environment (OS, Node version).
3. If a workaround exists, document it.
4. Do not file public issues.

## Regression tests

Before declaring a phase complete:

1. Run all existing tests: `pnpm -r test`
2. Run the docs example tests: `pnpm --filter @projectforge/cli test -- --run src/docs.integration.test.ts src/links.test.ts`
3. Run a clean-room create + add cycle
4. Verify no existing feature has regressed

## Definition of Done (local PR)

For a local change to be considered complete:

- [ ] All existing tests pass.
- [ ] New tests cover the change.
- [ ] TypeScript compiles without errors.
- [ ] Lint passes.
- [ ] Documentation is updated.
- [ ] No push, publish, deploy, or credential use.
