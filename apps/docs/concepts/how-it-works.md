# How Project Forge Works

Project Forge generates projects in three phases: plan, execute, and verify.

## 1. Plan

When you run a command like `projectforge add auth`, the engine:

1. **Loads the registry** — reads all module and starter manifests.
2. **Resolves dependencies** — builds a topological dependency graph, detecting cycles and conflicts.
3. **Generates a plan** — a deterministic, serializable list of operations.

The plan is a pure data structure — no files are changed during planning.

## 2. Execute

The plan is executed transactionally:

1. **Integrity check** — verifies no user-modified managed files would be overwritten.
2. **Backup** — copies existing files and package manifests.
3. **Write files** — copies module templates and renders generated files.
4. **Install packages** — runs the package manager to install new dependencies.
5. **Verify** — runs verification commands (typecheck, test, build).

## 3. Commit or Rollback

- **Success:** The transaction is committed. Backups are cleaned up.
- **Failure:** All changes are rolled back to the pre-transaction state. If rollback itself fails, a recovery report is generated.

## Determinism

The same inputs always produce the same output:

- Dependency resolution uses a deterministic topological sort.
- File checksums are SHA256 hashes of raw content.
- Plans are serializable and reproducible.
- No timestamps, absolute paths, or environment-specific data affect the plan.

## Registry

The registry is a local directory structure:

```text
packages/registry/
├── starters/
│   └── default.json           # Starter manifest
│   └── default/template/...   # Starter template files
└── modules/
    ├── auth.json              # Module manifest
    ├── auth/template/...      # Module template files
    ├── database-d1.json
    └── ...
```

Each manifest declares its identity, requirements, conflicts, file operations, and capabilities.
