# Generated vs User-Owned Files

Project Forge generates files alongside your custom code. Understanding the ownership model prevents conflicts.

## Ownership Types

| Type | Description | Overwritten on Sync? |
|------|-------------|----------------------|
| `factory-generated` | Produced by the starter or module system | ✅ Yes (if checksum matches) |
| `module-managed` | Owned by a specific installed module | ✅ Yes (if checksum matches) |
| `user-owned` | Created by the developer | ❌ Never |
| `extension` | Designated safe zones for user code | ❌ Never |

## How it Works

Every generated file has a **provenance record** in `projectforge-lock.json`:

```json
{
  "provenance": {
    "apps/api/src/features/index.ts": {
      "ownership": "factory-generated",
      "ownerId": "auth",
      "ownerVersion": "0.0.0",
      "operation": "render",
      "classification": "generated",
      "checksum": "abc123..."
    }
  }
}
```

## Safety Guarantees

1. **Before any write**, the engine checks the current file's SHA256 against the recorded checksum.
2. If they match → the file is safe to overwrite (user hasn't touched it).
3. If they differ → `PF_USER_MODIFIED_MANAGED_FILE` error is raised. No writes occur.

## Best Practices

- **Don't edit generated files.** Create new files in extension zones.
- **Use `.env` for configuration**, not generated source files.
- **Add custom routes** in `apps/web/src/features/` — the generated index won't touch them.
- **Extend contracts** by adding new files to `packages/contracts/src/`.
