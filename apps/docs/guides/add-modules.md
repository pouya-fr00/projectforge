# Add Modules

Modules add features to your project: authentication, database, dashboards, comments, and more.

## Adding a single module

```bash
# Working directory: project root
projectforge add auth
```

## Adding multiple modules

```bash
projectforge add auth admin-dashboard
```

## Transitive dependencies

When you add a module, Project Forge automatically resolves and installs its transitive dependencies:

```bash
# Adds rbac, which transitively adds auth and database-d1
projectforge add rbac
```

## Dry-run preview

Always preview what will change before applying:

```bash
projectforge add comments --dry-run
```

## Files changed

| Operation | Description |
|-----------|-------------|
| File copy | Module template files are copied into your project |
| Package install | npm/pnpm packages are added to `package.json` |
| Environment keys | Required env keys are added to `.env.example` |
| Migration files | SQL migration files are copied to `migrations/` |
| Route generation | API and web routes are registered in feature indexes |

## Repeated add

Adding a module that is already installed is safe — it produces a deterministic no-op:

```bash
projectforge add auth    # first time: installs
projectforge add auth    # second time: no-op
```

## Verifying

After adding modules, verify the project is healthy:

```bash
projectforge doctor
pnpm run typecheck
pnpm run test
```

## Rollback on failure

If any step fails (file write, package install, verification), Project Forge automatically rolls back to the previous state. Your project is never left in a broken state.

```bash
# If this fails, all changes are rolled back
projectforge add comments
```
