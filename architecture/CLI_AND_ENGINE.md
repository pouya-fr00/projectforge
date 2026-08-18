# CLI and Engine Architecture

## Command pipeline

```text
parse args
→ locate/create project
→ load schemas/state
→ resolve registry item
→ compute plan
→ render or return JSON
→ acquire lock
→ execute transaction
→ run verification
→ commit state or rollback
→ render outcome
```

## Core application services

- `CreateProjectService`
- `PlanModulesService`
- `InstallModulesService`
- `SyncGeneratedFilesService`
- `ProjectStatusService`
- `DoctorService`
- `UpgradeCheckService`

## Interfaces

- filesystem;
- process runner;
- package manager;
- clock;
- ID generator;
- terminal;
- registry source;
- checksum provider.

Tests use in-memory or temporary adapters.

## Output modes

### Human

Readable summary, tables, progress, actionable errors. No excessive animation. Respect `NO_COLOR` and non-TTY environments.

### JSON

Stable object with:

```json
{
  "schemaVersion": 1,
  "command": "plan",
  "ok": true,
  "data": {},
  "warnings": [],
  "errors": []
}
```

No human prose outside JSON when `--json` is used.

## Exit codes

- `0`: success;
- `1`: expected user/config/module error;
- `2`: invalid CLI usage;
- `3`: verification failed and rollback succeeded;
- `4`: rollback failed or recovery required;
- `5`: internal defect.

Exact mapping must be documented and tested.
