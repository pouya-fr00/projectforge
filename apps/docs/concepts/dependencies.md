# Module Dependencies

Modules declare their requirements, and Project Forge resolves them automatically.

## Dependency Declaration

Each module manifest declares:

| Field | Description |
|-------|-------------|
| `requires` | Module IDs that must be installed first |
| `conflicts` | Module IDs that cannot coexist |

## Resolution Rules

1. **Transitive resolution** — adding `rbac` automatically adds `auth` and `database-d1`.
2. **Topological order** — modules are installed in dependency order (dependencies first).
3. **Deterministic output** — the same input always produces the same order.
4. **Cycle detection** — circular dependencies (`A → B → A`) are rejected with `PF_CYCLIC_DEPENDENCY`.
5. **Conflict detection** — mutually exclusive modules are rejected with `PF_MODULE_CONFLICT`.
6. **Duplicate detection** — requesting the same module twice is a no-op.

## Dependency Chain Example

```text
rbac → auth → database-d1

projectforge add rbac
# Installs: database-d1 → auth → rbac
```

## Checking Dependencies

```bash
# See the dependency order
projectforge explain rbac

# Plan output shows dependency chain
projectforge plan rbac --json
```
