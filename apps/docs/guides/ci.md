# CI Usage

This guide covers running Project Forge inside a CI/CD pipeline.

## Prerequisites

Your CI environment must have:

- **Node.js** v24 or later
- **pnpm** v11 or later

Enable pnpm with `corepack`:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Deterministic install

Always use a lockfile and frozen install:

```bash
pnpm install --frozen-lockfile
```

If you are checking out a generated project (not the factory monorepo), ensure `projectforge-lock.json` and `pnpm-lock.yaml` are committed and install with `--frozen-lockfile`.

## Standard CI checks

Run these in order. Stop on first failure.

```bash
# 1. Lint
pnpm lint

# 2. Typecheck all workspace packages
pnpm -r typecheck

# 3. Run tests
pnpm -r test

# 4. Build
pnpm -r build
```

For the Project Forge monorepo itself, also run:

```bash
# 5. Build the documentation site
pnpm --filter @projectforge/docs build
```

## Using exit codes

Project Forge CLI uses stable exit codes. You can branch on them in CI:

| Code | Meaning | CI Action |
|---|---|---|
| `0` | Success | Continue |
| `1` | Project/module/config error | Fail the pipeline; fix the issue |
| `2` | Invalid usage | Fix the command |
| `3` | Verification failure (rollback succeeded) | Review verification; project is intact |
| `4` | Rollback failure (recovery required) | Escalate; check recovery report |
| `5` | Internal defect | Escalate; file a bug |

```bash
projectforge status --json
if [ $? -eq 0 ]; then
  echo "Project is healthy"
else
  echo "Project check failed with exit code $?"
  exit 1
fi
```

## JSON output for automation

Use `--json` with any command to get a parseable JSON envelope. Do not parse human-readable text.

```bash
# Query project status programmatically
STATUS=$(projectforge --json status)
HEALTHY=$(echo "$STATUS" | jq '.data.healthy')

# List modules for CI reporting
MODULES=$(projectforge --json list)
echo "$MODULES" | jq '.data.modules[]'
```

The JSON envelope always has this structure:

```json
{
  "schemaVersion": 1,
  "command": "status",
  "ok": true,
  "data": { "healthy": true },
  "warnings": [],
  "errors": []
}
```

## Secrets in CI

**Never** log the full output of Project Forge commands unless you have verified no secrets are present. The CLI redacts known secret patterns (`BETTER_AUTH_SECRET`, passwords, tokens, `Authorization` headers), but your CI should still:

- Redirect `stdout`/`stderr` to a log file, not the CI console.
- Mask environment variables in CI logs.
- Never store `.env` files as CI artifacts.

## Caching

**Safe to cache:**

- `node_modules/` (invalidate when `pnpm-lock.yaml` changes)
- `~/.pnpm-store` (pnpm store)

**Do NOT cache:**

- `.projectforge/` — contains transaction locks and recovery reports
- `dist/` — rebuild from source
- `coverage/` — regenerate

## Handling failure

When a command fails:

1. **Check exit code** to determine severity.
2. **Read the JSON error envelope** if `--json` was used.
3. **Check for a recovery report** at `.projectforge/recovery-report-*.json` if exit code is `4`.
4. **Clean up stale transaction locks** with `projectforge doctor` before retrying.

## Example GitHub Actions workflow

This workflow is compatible with the current Project Forge monorepo structure.
It does **not** publish, deploy, or use any credentials.

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Enable pnpm
        run: |
          corepack enable
          corepack prepare pnpm@latest --activate

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm -r typecheck

      - name: Test
        run: pnpm -r test

      - name: Build
        run: pnpm -r build

      - name: Build docs
        run: pnpm --filter @projectforge/docs build
```

## Notes

- The Workflow above does **not** publish to npm, deploy to any service, or push to any remote beyond the repository checkout.
- All commands are read-only or produce artifacts inside the workspace.
- If you add a generated project to your own CI, use the generated project's own test/build commands.
