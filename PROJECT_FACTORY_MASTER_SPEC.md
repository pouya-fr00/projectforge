# Project Factory — Master Specification

## 1. Executive summary

Project Factory is an open-source developer tool that creates and extends a known full-stack TypeScript project through a deterministic CLI, a schema-validated module registry, and a transactional installation engine.

The product reduces repeated work in:

- repository and workspace setup;
- frontend and API foundations;
- database bindings and migrations;
- authentication and sessions;
- roles and permissions;
- user and admin dashboard shells;
- comments and common CRUD flows;
- validation, error handling, testing, CI, localization, and documentation.

It does not generate a finished business product. It supplies reliable common foundations so developers can focus on product-specific workflows.

## 2. Primary users

### Human developer

Wants a project that starts quickly, is understandable, and does not trap them in a proprietary runtime.

### Maintainer

Needs a focused compatibility matrix, reproducible tests, low-cost public distribution, and controlled release scope.

## 3. Core user outcomes

1. Create a working golden-stack project from an empty directory.
2. Inspect available modules and prerequisites.
3. Add compatible modules without manual file copying.
4. Preview exact changes before mutation.
5. Recover automatically if installation verification fails.
6. Understand installed provenance and project health.
7. Customize source-owned feature code without running a Project Factory service.

## 4. Product surfaces

### CLI

Canonical commands are defined in `implementation/CLI_COMMAND_SPEC.md`.

Minimum V1 surface:

- `create`
- `list`
- `explain`
- `plan`
- `add`
- `sync`
- `status`
- `doctor`
- `upgrade --check`
- `help`

### Registry

Bundled, versioned metadata and assets for starters and modules. No central registry server is required.

### Generated project contract

A `.project-factory/` directory stores state, lock data, checksums, transaction metadata, and generated-file ownership.

### Documentation

Repository docs and a static docs site. Every quickstart is tested.

### Machine-readable output

A machine-readable module catalog and JSON command output for scripting and CI automation.

## 5. V1 golden stack

The first release is intentionally narrow:

```text
pnpm workspace
TypeScript strict
apps/web: React + Vite
apps/api: Hono + Cloudflare Workers
packages/contracts
packages/config
packages/ui
packages/test-utils
Vitest + Playwright
GitHub Actions
```

Optional V1 modules:

```text
database-d1
auth
rbac
user-dashboard
admin-dashboard
comments
```

Phase 0 confirms exact library versions and whether any compatibility issue requires adjusting the list without expanding scope.

## 6. Module dependency graph

```text
database-d1
    ├── auth
    │    ├── rbac
    │    │    ├── admin-dashboard
    │    │    └── comments
    │    └── user-dashboard
    └── comments
```

Rules:

- `auth` requires `database-d1`.
- `rbac` requires `auth`.
- `admin-dashboard` requires `rbac`.
- `user-dashboard` requires `auth`.
- V1 `comments` requires `auth` and `database-d1`.

The engine resolves transitive dependencies and displays them before install.

## 7. Code ownership model

### Factory-generated files

Regenerated from project state. Clearly marked. Users should not edit them. Examples:

- route aggregation;
- module registration;
- generated environment schema fragments;
- generated navigation entries;
- generated migration index.

### Module source files

Copied into the generated project with provenance and checksums. Users may customize them. Project Factory must not overwrite changed files during sync or upgrade checks.

### User-owned files

Never overwritten. Integration happens through extension points or generated registries.

## 8. Installation transaction

Every mutating operation follows:

1. load and validate project state;
2. resolve requested modules;
3. validate compatibility and conflicts;
4. calculate a deterministic plan;
5. show the plan or emit JSON;
6. acquire a project lock;
7. snapshot affected state;
8. stage changes;
9. validate staged result;
10. commit atomically where possible;
11. install dependencies only after file plan is safe;
12. run module verification;
13. update lock and provenance;
14. remove transaction backup on success;
15. restore snapshot on failure.

The tool must print whether rollback succeeded. A failed rollback is a critical error with retained recovery data.

## 9. Conflict policy

The engine refuses to continue when:

- a target path escapes the project root;
- a user-owned target already exists with different content;
- a generated file contains unexpected manual edits;
- module dependencies are incompatible;
- engine/starter versions are unsupported;
- a required environment variable name conflicts semantically;
- migrations have duplicate IDs;
- a package constraint cannot be resolved under the supported policy.

`--force` must not bypass path safety, manifest validation, or incompatible schema versions. V1 should avoid a broad `--force`; use explicit, narrow recovery commands instead.

## 10. Idempotency

Re-running an installed module command must either:

- report no changes; or
- produce a deterministic sync plan for missing generated artifacts.

It must not duplicate routes, navigation, dependencies, migrations, or environment variables.

## 11. Lockfile and provenance

The lock records:

- engine version;
- starter ID/version;
- module IDs/versions;
- source package integrity;
- installed file checksums;
- generated file checksums;
- dependency versions selected by the factory;
- install timestamp;
- schema version.

The lockfile contains no secrets, absolute personal paths, machine identifiers, or submitted source code.

## 12. CLI UX

- Default output is readable and concise.
- `--json` returns stable structured output.
- `--dry-run` performs no writes or installs.
- Interactive prompts always have non-interactive flags.
- CI mode never waits for input.
- Errors use stable codes such as `PF_MODULE_CONFLICT`.
- Every error states cause, affected path/module, and next action.
- Successful add output lists files, packages, migrations, env keys, and verification results.

## 13. Documentation product requirements

A new user must have three obvious paths from README:

1. Create a new app manually.
2. Use Project Factory from a script or CI pipeline.
3. Understand what gets added before installing.

Required documentation includes:

- five-minute quickstart;
- architecture overview;
- command reference;
- one page per module;
- complete generated-project map;
- troubleshooting by error code;
- upgrade and customization limitations;
- contribution and module authoring guides;
- two real examples;
- Persian startup guide.

## 14. Security and privacy

- no telemetry by default;
- no network call required except normal package retrieval chosen by the user;
- no arbitrary module scripts;
- safe extraction and path validation;
- no secret values in logs;
- dependencies pinned by lockfiles in the repository;
- release provenance and checksums where practical;
- security policy and responsible disclosure route;
- generated auth code follows upstream official integration guidance and gets dedicated security tests.

## 15. Open-source and cost model

The core repository is public and MIT licensed. The tool is free for personal and commercial use subject to the license notice.

The maintainer should not need to operate a backend. Normal project costs are limited to optional personal choices such as domains or third-party deployment services—not Project Factory runtime costs.

## 16. Non-goals

See `product/NON_GOALS.md`. Most importantly, V1 is not:

- a universal framework;
- a visual app builder;
- a hosted SaaS;
- a deployment platform;
- an automatic business-logic generator;
- a fully automatic customized-code merge/upgrader;
- a marketplace for untrusted third-party modules.

## 17. Release criteria

Release requires all items in `product/DEFINITION_OF_DONE.md`, including clean-room creation, module composition tests, rollback tests, documentation usability tests, security review, and two generated example apps.
