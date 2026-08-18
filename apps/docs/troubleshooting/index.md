# Troubleshooting

Common issues and their solutions.

## Installation issues

### `command not found: projectforge`

**Cause:** Project Forge CLI is not installed or not on your PATH.

**Fix:** Install globally or use npx:

```bash
npm install -g projectforge
# or
npx projectforge ...
```

### `pnpm: command not found`

**Cause:** pnpm is not installed.

**Fix:**

```bash
npm install -g pnpm
```

## Project Lock

### `PF_PROJECT_LOCKED`

**Cause:** Another Project Forge process is running, or a previous process crashed.

**Diagnostic:**

```bash
ls projectforge.lock
```

**Fix:** Wait for the other process. If the lock is stale (file older than 5 minutes), delete it:

```bash
rm projectforge.lock
```

### Stale Transaction

**Cause:** A previous transaction was interrupted and left incomplete state.

**Fix:** Run `projectforge doctor` to detect and recover. If a `.recovery-report.json` exists, review it for manual recovery steps.

## Conflicts

### `PF_MODULE_CONFLICT`

**Cause:** The requested modules explicitly conflict.

**Fix:** Choose one of the conflicting modules. Check module documentation for alternatives.

### `PF_CYCLIC_DEPENDENCY`

**Cause:** Modules form a dependency cycle.

**Fix:** This is a registry configuration issue. Report it if using official modules.

## Verification

### `PF_VERIFICATION_FAILED`

**Cause:** Typecheck, test, or build failed after applying changes.

**Fix:** The project was rolled back. Check the error output for the specific failure:

```bash
pnpm run typecheck
pnpm run test
pnpm run build
```

## Auth / Database

### Missing `BETTER_AUTH_SECRET`

**Cause:** The environment variable is not set.

**Fix:**

```bash
cp .env.example .env
# Edit .env and set BETTER_AUTH_SECRET to a random string
```

### Database migration fails

**Cause:** Migration SQL has an error or the database is in an inconsistent state.

**Diagnostic:**

```bash
node migrations/runner.mjs
```

**Fix:** Check the migration output. If using the local SQLite runner, delete `local.db` and re-run migrations from scratch.

## Windows-specific issues

For issues on Windows, see the [Windows troubleshooting guide](/troubleshooting/windows) which covers:

- PowerShell and Command Prompt
- Paths with spaces
- EPERM during cleanup
- CRLF vs LF
- Native dependency errors (better-sqlite3)
