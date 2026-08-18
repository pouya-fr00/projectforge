# Config Schema

The `projectforge.json` file describes your project configuration.

## Schema

```json
{
  "schemaVersion": 1,
  "name": "my-app",
  "starter": "default",
  "modules": ["database-d1", "auth", "rbac"]
}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schemaVersion` | `number` | Yes | Config schema version (currently `1`) |
| `name` | `string` | Yes | Project name (kebab-case) |
| `starter` | `string` | Yes | Starter ID used to create the project |
| `modules` | `string[]` | Yes | Module IDs installed in the project |

## Lockfile

The `projectforge-lock.json` records the exact versions, checksums, and provenance of installed components.

```json
{
  "schemaVersion": 1,
  "engineVersion": "0.1.0",
  "starter": {
    "id": "default",
    "version": "0.0.0",
    "checksum": "<sha256>"
  },
  "modules": [
    {
      "id": "auth",
      "version": "0.0.0",
      "checksum": "<sha256>"
    }
  ],
  "generatedChecksums": {},
  "provenance": {},
  "timestamp": "2026-07-29T00:00:00.000Z"
}
```

### Provenance

Each generated file has a provenance record in the lockfile:

| Field | Description |
|-------|-------------|
| `ownership` | `factory-generated`, `module-managed`, `user-owned`, `extension`, `unknown` |
| `ownerId` | Module or starter that owns this file |
| `ownerVersion` | Version of the owning component |
| `operation` | Type of operation that produced this file |
| `classification` | `generated` or `managed` |

Provenance prevents `sync` from overwriting files that the user has modified.
