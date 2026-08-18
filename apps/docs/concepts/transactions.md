# Transactions and Rollback

Every mutation in Project Forge is transactional. If anything fails, your project is restored to its exact previous state.

## Transaction Lifecycle

```text
1. Preflight integrity check
   ↓
2. Backup existing state
   ↓
3. Write files and install packages
   ↓
4. Run verification (typecheck, test, build)
   ↓
5a. Success → Clean up backups, commit
5b. Failure → Rollback, restore from backups
```

## What Gets Backed Up

- Files that will be overwritten or removed
- `package.json` and package-manager lockfile
- `projectforge.json` and `projectforge-lock.json`
- Generated route indexes

## What Gets Rolled Back

- All file writes are reversed
- All package installs are reversed
- Backup files are restored to their original locations
- User-created files are **never** touched

## Rollback Failure

If the rollback itself fails:

1. A **recovery report** is written to `.projectforge/recovery-report.json`.
2. The CLI exits with **code 4** (`PF_ROLLBACK_FAILED`).
3. The recovery report contains:
   - Paths of files that couldn't be restored
   - Actions to manually recover
   - No secrets, passwords, or tokens

## Dry-Run

`--dry-run` performs the integrity check and plan generation without any writes:

- No files are created or modified
- No packages are installed
- No backups are created
- No transaction lock is acquired
- The plan is displayed for review

## Transaction Lock

During a transaction, a lock file prevents concurrent mutations:

- `PF_PROJECT_LOCKED` if another process is active
- Stale locks (older than 5 minutes) can be removed manually
- The lock is released on both success and failure
