# System Architecture

## Architecture sentence

Project Factory is a local CLI with a bundled versioned registry, a pure planning engine, a transactional filesystem executor, and generated projects that run independently after creation.

## Context

```text
Developer
        |
        v
Project Factory CLI
        |
        +--> Config/manifest schemas
        +--> Bundled starter and module registry
        +--> Dependency/compatibility resolver
        +--> Deterministic change planner
        +--> Transactional executor + rollback
        +--> Verification runner
        |
        v
User-owned generated repository
        |
        +--> web app
        +--> API
        +--> optional modules
        +--> Project Factory state/lock/provenance
```

There is no Project Factory production backend in the normal path.

## Recommended monorepo

```text
.
├── apps/
│   └── docs/
├── packages/
│   ├── cli/
│   ├── engine/
│   ├── schemas/
│   ├── registry/
│   ├── test-harness/
│   └── create-project/
├── starters/
│   └── react-vite-hono-cloudflare/
├── modules/
│   ├── database-d1/
│   ├── auth/
│   ├── rbac/
│   ├── user-dashboard/
│   ├── admin-dashboard/
│   └── comments/
├── examples/
│   ├── account-app/
│   └── admin-comments-app/
├── docs/
├── scripts/
└── tests/
```

## Package boundaries

### `schemas`

JSON schemas, TypeScript types, parsers, schema migration rules. No filesystem mutation.

### `engine`

Pure planning, graph resolution, compatibility, ownership, checksums, transaction model, and diagnostics. Filesystem and process access behind interfaces.

### `registry`

Validated starter/module metadata and asset loading. No execution of arbitrary scripts.

### `cli`

Argument parsing, terminal rendering, input adapters, exit codes, JSON output. Calls engine application services.

### `create-project`

Small public entry package for the create flow if packaging research supports it.

### `test-harness`

Temporary workspaces, fixture projects, failure injection, clean-room generation, command capture.

## Dependency direction

```text
schemas <- engine <- cli
schemas <- registry <- engine
engine interfaces <- filesystem/process adapters
```

Starters and modules are data/assets consumed by registry and engine, not imported application code.

## Architectural invariants

- Planning is pure and testable.
- Execution consumes an immutable plan.
- CLI formatting is separate from domain errors.
- Interactive input is handled through adapters, not business logic.
- Generated projects do not import the factory runtime in production.
- Module assets cannot run arbitrary installation code.
