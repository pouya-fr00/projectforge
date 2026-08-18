# V1 Scope

## Included

### Core engine

- schema loading and validation;
- bundled starter/module registry;
- compatibility and dependency resolution;
- deterministic install plan;
- dry-run and JSON output;
- project lock;
- staged mutation and rollback;
- generated-file sync;
- provenance and checksums;
- diagnostics and stable errors.

### CLI

- `create`
- `list`
- `explain`
- `plan`
- `add`
- `sync`
- `status`
- `doctor`
- `upgrade --check`

### Starter

One React/Vite/Hono/Cloudflare/pnpm/TypeScript starter with contracts, config, UI, tests, localization foundation, and CI.

### Modules

- `database-d1`
- `auth`
- `rbac`
- `user-dashboard`
- `admin-dashboard`
- `comments`

### Public project quality

- MIT license;
- contributing and security policies;
- complete README;
- static docs;
- two examples;
- changelog/release process;
- clean-room CI;

## Deferred

- generic third-party module marketplace;
- automatic uninstall;
- automatic merge of customized files during upgrade;
- multiple frontend/backend/database stacks;
- graphical interface;
- hosted project generation;
- accounts or cloud sync;
- opt-in telemetry;
- deployment automation;
- billing, teams, OAuth, email delivery, file uploads, notifications.

## Scope change rule

A feature is not V1 merely because it is common. Additions require removing comparable scope or an explicit owner decision recorded as an ADR.
