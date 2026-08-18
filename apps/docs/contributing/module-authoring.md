# Module Authoring

This guide covers creating a new module for Project Forge.

## Creating a module

### 1. Create the manifest

Create `packages/registry/modules/<module-id>.json`:

```json
{
  "id": "my-module",
  "version": "0.0.0",
  "schemaVersion": 1,
  "displayName": "My Module",
  "description": "A short description of what this module provides.",
  "compatibility": { "engine": ">=0.0.0" },
  "dependencies": [],
  "packages": [],
  "devPackages": [],
  "environment": [],
  "routeContributions": [],
  "webRouteContributions": [],
  "migrations": [],
  "verificationCommands": []
}
```

### 2. Create template files

Place files under `packages/registry/modules/<module-id>/template/`. The directory structure mirrors the generated project:

```
template/
├── apps/
│   ├── api/src/features/<module-id>/index.ts
│   ├── api/src/features/<module-id>/index.test.ts
│   └── web/src/features/<module-id>/index.tsx
├── packages/contracts/src/<module-id>.ts
└── migrations/000N_<module-id>_init.sql
```

### 3. Define dependencies

If your module needs another module, add it to `dependencies`:

```json
"dependencies": ["database-d1", "auth"]
```

The resolver installs transitive dependencies automatically. If a user runs `projectforge add rbac`, both `auth` and `database-d1` are installed.

### 4. Add routes

For API routes, add to `routeContributions`:

```json
"routeContributions": [
  { "path": "/api/my-feature", "importPath": "./features/my-feature/index.js" }
]
```

For web (React) routes, add to `webRouteContributions`:

```json
"webRouteContributions": [
  { "path": "/my-feature", "importPath": "./features/my-feature/index.js" }
]
```

The planner auto-generates `apps/api/src/features/index.ts` and `apps/web/src/features/index.tsx` from these contributions.

### 5. Add migrations

If your module needs a database table, add a SQL file:

```json
"migrations": ["migrations/000N_my_table.sql"]
```

Migration IDs (the `000N` prefix) must be unique across all installed modules. The executor rejects duplicate migration IDs at plan time.

### 6. Add verification commands

```json
"verificationCommands": ["pnpm -r typecheck"]
```

These run after the module is installed. If a verification command fails, the transaction is rolled back.

## Template rules

- All paths in the manifest must be **relative** and **safe** (no `../` or absolute paths).
- Template files should be **complete and working** — not stubs.
- Tests in template directories are excluded from the workspace registry package tests.
- Do not include secrets, API keys, or environment-specific values in templates.
- Use `.env.example` patterns where secrets are needed.

## Testing your module

### Unit tests for template files

Write Vitest tests in `template/apps/api/src/features/<id>/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('my module', () => {
  it('handles valid input', async () => {
    // Test using Hono test client or direct function calls
  });
});
```

### Integration tests for module installation

Add a test to `packages/cli/src/`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCli } from './integration-helpers.js';

const TMP = /* temp dir */;

describe('my-module integration', () => {
  beforeAll(async () => {
    await runCli(['create', 'testapp', '--no-install'], TMP);
    await runCli(['add', 'my-module', '--no-install'], /* project dir */);
  });

  it('writes expected files', () => {
    // Assert template files exist
  });

  it('repeated add is deterministic', async () => {
    const r = await runCli(['add', 'my-module', '--no-install'], /* project dir */);
    expect(r.exitCode).toBe(0);
  });
});
```

## Documentation requirements

For every new module:

- [ ] Entry in `apps/docs/reference/modules.md`
- [ ] Manifest at `packages/registry/modules/<id>.json`
- [ ] Template files in `packages/registry/modules/<id>/template/`
- [ ] Integration tests in `packages/cli/src/`
- [ ] Module reference follows the [module page template](/reference/modules)
