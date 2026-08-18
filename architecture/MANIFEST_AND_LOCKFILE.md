# Manifest and Lockfile

## Generated project files

```text
.project-factory/
├── project.json
├── lock.json
├── checksums.json
├── generated-manifest.json
├── transactions/
└── README.md
```

Transaction backups are ignored by Git and removed after successful completion unless debug retention is enabled.

## `project.json`

Human-reviewable desired state:

```json
{
  "$schema": "https://example.invalid/project-factory/project.schema.json",
  "schemaVersion": 1,
  "starter": "react-vite-hono-cloudflare",
  "modules": ["database-d1", "auth", "rbac"],
  "options": {
    "languages": ["en", "fa"],
    "defaultLanguage": "en"
  }
}
```

Final schema URL is chosen after public naming.

## `lock.json`

Machine-owned resolved state:

- exact engine/starter/module versions;
- package integrity;
- file ownership and original checksums;
- generated output checksums;
- schema version;
- package-manager metadata;
- completed transaction ID.

## Secret safety

Never record:

- environment values;
- auth secrets;
- database content;
- usernames/emails;
- machine IDs;
- home directory;
- repository tokens.

## Schema migration

Engine must migrate older supported state schemas using pure, tested migrations. Unknown future schema versions fail closed with upgrade guidance.
