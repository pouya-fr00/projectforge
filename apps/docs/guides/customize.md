# Customize Safely

Project Forge generates files alongside your custom code. Understanding which files are safe to edit prevents conflicts and data loss.

## File ownership types

| Type | Description | Safe to edit? |
|------|-------------|---------------|
| `factory-generated` | Produced by the Factory; overwritten on sync | ❌ No |
| `module-managed` | Owned by a module; may be updated on module sync | ❌ No |
| `user-owned` | Your custom code; never touched by Factory | ✅ Yes |
| `extension` | Extension points designed for user code | ✅ Yes |

## How to customize safely

### 1. Use extension points

Extension points are files or directories designed for your custom code:

```text
apps/web/src/features/    # Your custom features go here
packages/ui/src/          # Your shared UI components
```

### 2. Edit source-owned files

Files you create are yours. The Factory never touches them:

```bash
# Safe — this is a user-owned file
echo "console.log('hello')" > apps/web/src/my-feature.ts
```

### 3. Configure, don't modify

Use environment variables and config files instead of editing generated code:

```env
# .env — safe to edit
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=https://your-app.com
```

### 4. Extend contracts

Add your types to the contracts package — the Factory adds module types without touching yours:

```typescript
// packages/contracts/src/my-types.ts — safe to create
export interface MyFeature {
  id: string;
  name: string;
}
```

## What happens if you edit a generated file?

Project Forge detects modified generated files via checksums. On the next `sync` or `add`, it:

1. Compares the current checksum with the one recorded in `projectforge-lock.json`.
2. If they differ, returns `PF_USER_MODIFIED_MANAGED_FILE`.
3. Does **not** overwrite your changes.

This protects your work but may block future syncs. To resolve:

- Revert your manual changes.
- Move custom logic to a source-owned file.
- Accept the divergence (sync will skip that file).

## Finding generated files

```bash
# Read the lockfile to see which files are factory-managed
cat projectforge-lock.json | grep -A5 provenance
```
