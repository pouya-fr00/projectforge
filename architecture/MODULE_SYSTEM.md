# Module System

## Principle

A module is a declarative, versioned capability package. It is not an arbitrary installer script.

## Module directory

```text
modules/<id>/
├── module.json
├── schema.json
├── files/
├── generated/
├── migrations/
├── docs/
│   └── README.md
├── tests/
└── fixtures/
```

## Manifest minimum

```json
{
  "$schema": "../../schemas/module.schema.json",
  "schemaVersion": 1,
  "id": "auth",
  "version": "0.1.0",
  "displayName": "Authentication",
  "description": "Email/password auth, session, protected routes, and profile foundation.",
  "engine": ">=0.1.0 <0.2.0",
  "starters": ["react-vite-hono-cloudflare"],
  "requires": ["database-d1"],
  "conflicts": [],
  "capabilities": ["auth.session", "auth.login", "auth.logout"],
  "files": [],
  "generatedContributions": [],
  "packages": [],
  "environment": [],
  "migrations": [],
  "verification": [],
  "documentation": "docs/README.md"
}
```

## No arbitrary scripts

V1 modules may request only supported operation types:

- copy a declared source-owned file;
- render a template with schema-validated values;
- add/remove a dependency in a known package;
- contribute an entry to a generated registry;
- add an environment key declaration;
- add a migration asset;
- add a documented configuration fragment;
- run a whitelisted repository verification command after application.

The module cannot specify a shell command to mutate the project.

## Composition model

Modules contribute to named integration slots, for example:

- `web.routes`
- `web.navigation.user`
- `web.navigation.admin`
- `api.routes`
- `db.schema`
- `auth.permissions`
- `env.schema`
- `tests.projects`

The engine validates contribution shape and regenerates integration files deterministically.

## Capability matching

Each module lists semantic capabilities so users and tools can compare a product requirement with:

```text
database.relational
auth.session
auth.email-password
permission.rbac
dashboard.user
dashboard.admin
comments.authenticated
```

The public catalog must be both human-readable and machine-readable.

## Customization boundary

Module docs identify:

- safe extension files;
- generated files not to edit;
- source-owned files users may change;
- required security invariants;
- upgrade limitations.
