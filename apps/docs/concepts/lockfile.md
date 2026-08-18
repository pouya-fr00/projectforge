# Lockfile and Provenance

The `projectforge-lock.json` records the exact state of every generated file, enabling safe syncs and integrity verification.

## Lockfile Structure

```json
{
  "schemaVersion": 1,
  "engineVersion": "0.1.0",
  "starter": {
    "id": "default",
    "version": "0.0.0",
    "checksum": "<sha256-of-manifest>"
  },
  "modules": [
    {
      "id": "auth",
      "version": "0.0.0",
      "checksum": "<sha256-of-manifest>"
    }
  ],
  "generatedChecksums": {
    "apps/api/src/index.ts": "<sha256>"
  },
  "provenance": {
    "apps/api/src/index.ts": {
      "ownership": "factory-generated",
      "ownerId": "auth",
      "ownerVersion": "0.0.0",
      "operation": "render",
      "classification": "generated"
    }
  }
}
```

## Provenance Model

Each file tracked in the lockfile has provenance metadata:

| Field | Values | Purpose |
|-------|--------|---------|
| `ownership` | `factory-generated`, `module-managed`, `user-owned`, `extension`, `unknown` | Who owns the file |
| `ownerId` | Module or starter ID | Which component produced it |
| `ownerVersion` | Semver version | Version that produced it |
| `operation` | `copy`, `render`, `generate` | How it was created |
| `classification` | `generated`, `managed` | How it should be treated |

## Why Provenance Matters

1. **Integrity** — detects user modifications before overwriting.
2. **Auditability** — you always know what generated each file.
3. **Safe syncs** — only overwrite files whose checksums match.
4. **Version tracking** — know which module version produced which file.

## Checksums

All checksums are **SHA256 hashes** of the raw file content (or manifest content for modules/starters). Checksums are deterministic — no timestamps, absolute paths, or environment-specific data affect them.

## Lockfile in Version Control

✅ **Commit `projectforge-lock.json` to Git.** It enables reproducible installs and integrity verification across team members and CI.
